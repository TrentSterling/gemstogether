"""Measure the supplied local references; do not guess a historical plugin chain.

Writes comparative plots and a local listening report. Uses retained listening
references only for analysis, never as a TTS prompt or a production game asset.
"""
import hashlib
import html
import json
import os
import subprocess
import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'tools/out/voices/diagnosis-round8'
OUT.mkdir(parents=True,exist_ok=True)
os.environ['HF_HUB_OFFLINE']='1'
os.environ['TRANSFORMERS_OFFLINE']='1'
os.environ['NUMBA_CACHE_DIR']=str(OUT/'.cache/numba')
os.environ['MPLCONFIGDIR']=str(OUT/'.cache/matplotlib')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import parselmouth
import soundfile as sf
from scipy.signal import correlate, correlation_lags, stft, welch
from faster_whisper import WhisperModel

RATE=24000
SOURCES=[
 ('bej-welcome','Bejeweled 2 / Welcome back','bejeweled2-reference/matched-welcome_back.wav','reference'),
 ('silver-welcome','Silver / shipped welcome','processing-round7/dry-welcome-back.mp3','silver'),
 ('echo-welcome','17 / Deep echo and room','processing-round7/deep-echo-welcome-back.mp3','processed'),
 ('bej-excellent','Bejeweled 2 / Excellent','bejeweled2-reference/matched-excellent1.wav','reference'),
 ('bej-incredible','Bejeweled 2 / Incredible','bejeweled2-reference/matched-incredible.wav','reference'),
 ('silver-brilliant','Silver / shipped Brilliant','processing-round7/dry-brilliant.mp3','silver'),
 ('echo-brilliant','17 / processed Brilliant','processing-round7/deep-echo-brilliant.mp3','processed'),
 ('silver-resonance','Silver / shipped Resonance','processing-round7/dry-resonance.mp3','silver'),
 ('echo-resonance','17 / processed Resonance','processing-round7/deep-echo-resonance.mp3','processed'),
]
COLORS={'reference':'#e6c77e','silver':'#80e6e9','processed':'#f89dd1'}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def decode(path):
    result=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin',
        '-i',str(path),'-ar',str(RATE),'-ac','2','-f','f64le','-'],capture_output=True,check=True)
    return np.frombuffer(result.stdout,dtype='<f8').reshape((-1,2)).copy()


def loudness(path):
    result=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-i',str(path),
        '-af','loudnorm=I=-24:TP=-1.5:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
    return json.JSONDecoder().raw_decode(result.stderr[result.stderr.rfind('{'):])[0]


def pitch_track(audio,method='ac'):
    sound=parselmouth.Sound(audio,sampling_frequency=RATE)
    pitch=(sound.to_pitch_ac if method=='ac' else sound.to_pitch_cc)(time_step=.005,pitch_floor=45,pitch_ceiling=350)
    values=pitch.selected_array['frequency'].copy()
    strength=pitch.selected_array['strength']
    values[(values<=0)|(strength<.65)]=np.nan
    return pitch.xs(),values,strength


def stats(audio):
    time,values,strength=pitch_track(audio)
    _,other,_=pitch_track(audio,'cc')
    voiced=values[np.isfinite(values)]
    cents=12*np.log2(values/440)+69
    note_error=(cents-np.round(cents))*100
    # This is a descriptive statistic, NOT an Auto-Tune detector.
    nearest=np.mean(np.abs(note_error[np.isfinite(note_error)])<10)
    change=np.abs(np.diff(cents))*100
    contiguous=np.isfinite(cents[:-1])&np.isfinite(cents[1:])
    return dict(medianHz=round(float(np.median(voiced)),2),p10Hz=round(float(np.percentile(voiced,10)),2),
        p90Hz=round(float(np.percentile(voiced,90)),2),rangeSemitones=round(float(12*np.log2(np.percentile(voiced,90)/np.percentile(voiced,10))),2),
        medianCC=round(float(np.nanmedian(other)),2),voicedSeconds=round(float(len(voiced)*.005),3),
        nearSemitone10centsPercent=round(float(nearest*100),1),
        slowPitchFramePercent=round(float(np.mean(change[contiguous]<2)*100),1))


def spatial(audio):
    left,right=audio.T
    mid=(left+right)/2;side=(left-right)/2
    side_ratio=np.sum(side**2)/max(np.sum(mid**2)+np.sum(side**2),1e-20)
    corr=float(np.corrcoef(left,right)[0,1])
    cross=correlate(left,right,mode='full',method='fft')
    lags=correlation_lags(len(left),len(right),mode='full')
    keep=np.abs(lags)<=round(.04*RATE)
    lag=lags[keep][np.argmax(np.abs(cross[keep]))]
    _,lp,_=pitch_track(left);_,rp,_=pitch_track(right)
    joint=np.isfinite(lp)&np.isfinite(rp)
    cents=1200*np.log2(rp[joint]/lp[joint])
    return dict(channelCorrelation=round(corr,4),sideEnergyPercent=round(float(side_ratio*100),2),
                strongestLRLagMs=round(float(lag/RATE*1000),2),
                lagCaution='Periodicity makes cross-correlation lags ambiguous; this is not an identified delay.',
                leftMedianPitchHz=round(float(np.nanmedian(lp)),2),rightMedianPitchHz=round(float(np.nanmedian(rp)),2),
                jointPitchFrames=int(np.sum(joint)),
                medianRightMinusLeftCents=round(float(np.median(cents)),2) if len(cents) else None,
                rightMinusLeftCentsIQR=[round(float(np.percentile(cents,p)),2) for p in [25,75]] if len(cents) else None)


def bands(audio):
    f,p=welch(audio,fs=RATE,nperseg=4096,axis=0)
    if p.ndim==2:
        p=np.mean(p,axis=1)
    total=np.sum(p[(f>=45)&(f<10000)])
    return {str(lo)+'-'+str(hi):round(float(np.sum(p[(f>=lo)&(f<hi)])/total*100),2)
            for lo,hi in [(45,120),(120,250),(250,600),(600,1500),(1500,4000),(4000,10000)]}


def rms_track(audio):
    # Fixed 20 ms windows, with exact timestamps for comparing active envelopes.
    step=round(RATE*.01);size=round(RATE*.02)
    t=np.arange(0,max(1,len(audio)-size),step)/RATE
    rms=np.array([np.sqrt(np.mean(audio[i:i+size]**2)) for i in np.arange(0,max(1,len(audio)-size),step)])
    return t,20*np.log10(np.maximum(rms,1e-10))


def phrase_cut(audio,words):
    welcome=next((w for w in words if 'welcome' in w['word'].lower()),None)
    back=next((w for w in words if 'back' in w['word'].lower()),None)
    if not welcome or not back:
        raise ValueError('Cannot locate Welcome back')
    start=max(0,welcome['start']-.025);end=min(len(audio)/RATE,back['end']+.025)
    cut=audio[round(start*RATE):round(end*RATE)].copy()
    n=min(round(.008*RATE),len(cut)//3)
    cut[:n]*=np.linspace(0,1,n)[:,None];cut[-n:]*=np.linspace(1,0,n)[:,None]
    return cut,dict(startSeconds=round(start,3),endSeconds=round(end,3),
                    note='Word-aligned excerpt, not a separately performed two-word line.')


def matched(path):
    measure=loudness(path)
    gain=10**((-24-float(measure['input_i']))/20)
    audio,rate=sf.read(path,always_2d=True)
    for _ in range(3):
        if np.max(np.abs(audio*gain))>=.85:
            gain=.85/np.max(np.abs(audio))
        sf.write(path,audio*gain,rate,subtype='PCM_16')
        actual=loudness(path)
        error=-24-float(actual['input_i'])
        if abs(error)<.35:
            return dict(lufs=float(actual['input_i']),truePeakDb=float(actual['input_tp']))
        gain*=10**(error/20)
    raise ValueError('Unable to match '+str(path))


def make_plots(items):
    plt.rcParams.update({'figure.facecolor':'#071418','axes.facecolor':'#071418','savefig.facecolor':'#071418',
                        'text.color':'#f4e8d2','axes.labelcolor':'#b8c7c4','xtick.color':'#b8c7c4',
                        'ytick.color':'#b8c7c4','axes.edgecolor':'#365a5f','font.size':11})
    welcome=[i for i in items if i['id'].endswith('welcome')]
    fig,axes=plt.subplots(3,2,figsize=(13,10),constrained_layout=True)
    for row,item in enumerate(welcome):
        audio=item['audio'].mean(axis=1);time,pitch,strength=pitch_track(audio)
        axes[row,0].plot(time,pitch,color=COLORS[item['group']],lw=2)
        tc,pc,_=pitch_track(audio,'cc');axes[row,0].plot(tc,pc,color='#b8c7c4',alpha=.4,lw=.8)
        axes[row,0].set(ylim=(40,200),xlim=(0,3.2),ylabel='Fundamental pitch (Hz)',title=item['name'])
        axes[row,0].grid(alpha=.15);axes[row,0].axhline(88,color='#e6c77e',alpha=.4,ls='--')
        rt,r=rms_track(item['audio']);axes[row,1].plot(rt,r,color=COLORS[item['group']])
        axes[row,1].set(ylim=(-80,-10),xlim=(0,3.2),ylabel='Short-window RMS (dBFS)',title='Envelope, including effects')
        axes[row,1].grid(alpha=.15)
    axes[-1,0].set_xlabel('Seconds (different phrases; not aligned)');axes[-1,1].set_xlabel('Seconds')
    fig.suptitle('Welcome comparison: pitch contour and envelope\nColoured: autocorrelation. Grey: cross-correlation. Dashed: 88 Hz. No plugin attribution implied.',fontsize=13)
    fig.savefig(OUT/'welcome-pitch-envelope.png',dpi=150);plt.close(fig)
    fig,axes=plt.subplots(3,1,figsize=(12,8),constrained_layout=True)
    for ax,item in zip(axes,welcome):
        audio,rate=sf.read(OUT/item['phrase']['file'],always_2d=True)
        t,p,_=pitch_track(audio.mean(axis=1));ax.plot(t,p,color=COLORS[item['group']],lw=2)
        ax.set(xlim=(0,1.05),ylim=(45,155),ylabel='Hz',title=item['name']+' / only Welcome back')
        ax.grid(alpha=.15)
    axes[-1].set_xlabel('Seconds; same two words, original delivery timing')
    fig.suptitle('Same words: globally lowering Silver leaves its pitch movement intact',fontsize=14)
    fig.savefig(OUT/'welcome-phrase-pitch.png',dpi=150);plt.close(fig)
    fig,axes=plt.subplots(3,1,figsize=(13,10),constrained_layout=True)
    for ax,item in zip(axes,welcome):
        mono=item['audio'].mean(axis=1)
        f,t,z=stft(mono,fs=RATE,nperseg=4096,noverlap=3856)
        db=20*np.log10(np.maximum(np.abs(z),1e-8))
        keep=(f>=45)&(f<=2200)
        ax.pcolormesh(t,f[keep],db[keep],shading='auto',cmap='magma',vmin=-80,vmax=-25)
        ax.set(ylim=(45,2200),xlim=(0,3.2),ylabel='Frequency (Hz)',title=item['name'])
    axes[-1].set_xlabel('Seconds');fig.suptitle('Harmonic structure and sustained vowels (same colour scale)',fontsize=14)
    fig.savefig(OUT/'welcome-harmonics.png',dpi=150);plt.close(fig)
    fig,ax=plt.subplots(figsize=(12,5),constrained_layout=True)
    for item in welcome:
        f,p=welch(item['audio'],fs=RATE,nperseg=4096,axis=0);p=p.mean(axis=1)
        db=10*np.log10(np.maximum(p,1e-15));smooth=np.convolve(db,np.ones(9)/9,mode='same')
        ax.semilogx(f,smooth,label=item['name'],color=COLORS[item['group']])
    ax.set(xlim=(45,10000),ylim=(-120,-30),ylabel='Power spectral density (dB/Hz)',xlabel='Frequency (Hz)',
           title='Whole-clip spectrum: words differ, so this is not an EQ matching target')
    ax.legend();ax.grid(alpha=.2);fig.savefig(OUT/'welcome-spectrum.png',dpi=150);plt.close(fig)


def main():
    guards={p:digest(ROOT/p) for p in ['index.html','tools/announcer-pack.json']}
    snapshots=Path.home()/'.cache/huggingface/hub/models--Systran--faster-whisper-base/snapshots'
    model=WhisperModel(str(next(snapshots.iterdir())),device='cuda',compute_type='float16')
    items=[]
    for key,name,file,group in SOURCES:
        path=ROOT/'tools/out/voices'/file;audio=decode(path);mono=audio.mean(axis=1)
        segments,_=model.transcribe(str(path),
            language='en',beam_size=5,word_timestamps=True,condition_on_previous_text=False)
        segments=list(segments);words=[dict(word=w.word,start=w.start,end=w.end,probability=w.probability)
                                      for s in segments for w in s.words or []]
        record=dict(id=key,name=name,file=file,group=group,sourceSha256=digest(path),
                    durationSeconds=round(len(audio)/RATE,4),pitch=stats(mono),spatial=spatial(audio),
                    bandEnergyPercent=bands(audio),words=words,recognized=' '.join(s.text.strip() for s in segments),
                    measurementLimit='Final processed snippets; words and phonemes differ. Not enough to identify a plugin or actor.')
        # Retain an analysis decode, not a game/cloning asset.
        sf.write(OUT/(key+'.wav'),audio,RATE,subtype='PCM_16')
        record['listeningFile']=key+'.wav'
        if key.endswith('welcome'):
            phrase,bounds=phrase_cut(audio,words)
            path=OUT/(key+'-phrase.wav');sf.write(path,phrase,RATE,subtype='FLOAT')
            record['phrase']={**bounds,'durationSeconds':round(len(phrase)/RATE,4),
                'pitch':stats(phrase.mean(axis=1)),'spatial':spatial(phrase),
                'bandEnergyPercent':bands(phrase),'file':path.name,'level':matched(path)}
        if group=='reference':
            mid=audio.mean(axis=1);side=(audio[:,0]-audio[:,1])/2
            for label,signal in [('mid',mid),('side',side)]:
                path=OUT/(key+'-'+label+'.wav');sf.write(path,signal,RATE,subtype='PCM_16')
                record[label]=dict(file=path.name,rms=round(float(np.sqrt(np.mean(signal**2))),5),
                                   note='Same gain as the full clip; a stereo difference is not an isolated effects stem.')
        items.append({**record,'audio':audio});print(json.dumps(record),flush=True)
    make_plots(items)
    report=dict(clips=[{k:v for k,v in r.items() if k!='audio'} for r in items],guards=guards,
        method=dict(rate=RATE,pitchFloor=45,pitchCeiling=350,stepSeconds=.005,minPitchStrength=.65,
                    algorithms=['Praat autocorrelation','Praat cross-correlation'],
                    spectrum='Welch, power averaged across stereo channels without mono cancellation; descriptive only',
                    warning='Near equal-tempered pitch is not proof of pitch correction. Reverb can corrupt pitch and formant estimates. Averaging wide stereo channels can change the apparent pitch; compare the channel measurements.'),
        references=[dict(title='Praat pitch analysis',url='https://www.fon.hum.uva.nl/praat/manual/FAQ__Pitch_analysis.html'),
                    dict(title='Antares pitch correction controls',url='https://help.antarestech.com/hc/en-us/articles/42858099043092-AutoTune-Best-Practices')])
    for path,expected in guards.items():
        if digest(ROOT/path)!=expected:
            raise RuntimeError('Production changed: '+path)
    (OUT/'analysis.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    rows=[]
    for item in report['clips']:
        controls=f'<audio controls preload="none" src="{item["listeningFile"]}"></audio>'
        if 'phrase' in item:
            controls+=f'<label>Only the words Welcome back<audio controls preload="none" src="{item["phrase"]["file"]}"></audio></label>'
        if item['group']=='reference':
            controls+=f'<details><summary>Hear stereo centre and difference</summary><label>Centre, same gain<audio controls preload="none" src="{item["mid"]["file"]}"></audio></label><label>Difference, same gain<audio controls preload="none" src="{item["side"]["file"]}"></audio></label><p>The difference channel is not a clean reverb stem.</p></details>'
        rows.append(f'<section><h2>{html.escape(item["name"])}</h2><p>{item["pitch"]["medianHz"]} Hz median / {item["pitch"]["rangeSemitones"]} semitones between pitch percentiles / {item["spatial"]["sideEnergyPercent"]}% stereo difference energy</p>{controls}</section>')
    template=(ROOT/'tools/voice-diagnose.html').read_text(encoding='utf-8')
    a=next(i for i in report['clips'] if i['id']=='bej-welcome')['phrase']
    b=next(i for i in report['clips'] if i['id']=='echo-welcome')['phrase']
    measurements=[('Median pitch',lambda r:f'{r["pitch"]["medianHz"]:.0f} Hz'),
        ('Pitch span, 10th to 90th percentile',lambda r:f'{r["pitch"]["rangeSemitones"]:.1f} semitones'),
        ('Two-word excerpt duration',lambda r:f'{r["durationSeconds"]:.2f} seconds'),
        ('Stereo difference energy',lambda r:f'{r["spatial"]["sideEnergyPercent"]:.1f}%'),
        ('Energy in 120-250 Hz band',lambda r:f'{r["bandEnergyPercent"]["120-250"]:.1f}%'),
        ('Energy in 45-120 Hz band',lambda r:f'{r["bandEnergyPercent"]["45-120"]:.1f}%')]
    table=''.join(f'<tr><td>{title}</td><td>{value(a)}</td><td>{value(b)}</td></tr>' for title,value in measurements)
    (OUT/'index.html').write_text(template.replace('__DIAGNOSIS_ROWS__',''.join(rows)).replace('__DIAGNOSIS_TABLE__',table),encoding='utf-8')
    print('Measured nine clips; wrote four figures and word-aligned excerpts. Production unchanged.',flush=True)


if __name__=='__main__':
    main()
