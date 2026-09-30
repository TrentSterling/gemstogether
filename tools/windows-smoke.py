"""Run a packaged Windows smoke check without crash dialogs or stale receipts.

Use from a normal Windows shell, outside a restricted automation token:
    python tools/windows-smoke.py <Gems Together.exe> <receipt prefix>
Pass --preflight to check the runner without starting Electron.
"""
import argparse
import ctypes
import hashlib
import json
import os
import subprocess
import sys
import time
from ctypes import wintypes
from pathlib import Path


def token_state():
    kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    advapi = ctypes.WinDLL('advapi32', use_last_error=True)
    kernel.GetCurrentProcess.restype = wintypes.HANDLE
    advapi.OpenProcessToken.argtypes = [wintypes.HANDLE, wintypes.DWORD, ctypes.POINTER(wintypes.HANDLE)]
    advapi.OpenProcessToken.restype = wintypes.BOOL
    advapi.GetTokenInformation.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD)]
    advapi.GetTokenInformation.restype = wintypes.BOOL
    advapi.IsTokenRestricted.argtypes = [wintypes.HANDLE]
    advapi.IsTokenRestricted.restype = wintypes.BOOL
    kernel.CloseHandle.argtypes = [wintypes.HANDLE]
    token = wintypes.HANDLE()
    if not advapi.OpenProcessToken(kernel.GetCurrentProcess(), 8, ctypes.byref(token)):
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        appcontainer, length = wintypes.DWORD(), wintypes.DWORD()
        if not advapi.GetTokenInformation(token, 29, ctypes.byref(appcontainer), ctypes.sizeof(appcontainer), ctypes.byref(length)):
            raise ctypes.WinError(ctypes.get_last_error())
        return {'appContainer': bool(appcontainer.value), 'restrictedToken': bool(advapi.IsTokenRestricted(token))}
    finally:
        kernel.CloseHandle(token)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('executable')
    parser.add_argument('prefix')
    parser.add_argument('--preflight', action='store_true')
    args = parser.parse_args()
    if os.name != 'nt':
        parser.error('The native Windows check requires Windows.')
    state = token_state()
    if state['appContainer'] or state['restrictedToken']:
        print(json.dumps({'pass': False, 'phase': 'preflight', 'token': state,
                          'error': 'Refusing to start Electron from a restricted token. Use a normal Windows shell.'}))
        return 3
    root = Path(__file__).resolve().parents[1]
    exe, prefix = Path(args.executable).resolve(), Path(args.prefix).resolve()
    if not exe.is_relative_to(root) or exe.name != 'Gems Together.exe' or not exe.is_file():
        parser.error('Expected a packaged Gems Together executable inside this repository.')
    if not prefix.is_relative_to(root / 'tools/out'):
        parser.error('The receipt prefix must be inside tools/out.')
    source = root / 'index.html'
    packaged = exe.parent / 'resources/app/game/index.html'
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if hashlib.sha256(packaged.read_bytes()).hexdigest() != digest:
        parser.error('Packaged HTML differs from the current tested source.')
    kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    kernel.GetErrorMode.restype = wintypes.UINT
    kernel.SetErrorMode.argtypes = [wintypes.UINT]
    kernel.SetErrorMode.restype = wintypes.UINT
    prior = kernel.GetErrorMode()
    # Process-local and inherited by the child; no registry or machine policy changes.
    # https://devblogs.microsoft.com/oldnewthing/20160204-00/?p=92972
    kernel.SetErrorMode(prior | 0x8003)
    try:
        mode = kernel.GetErrorMode()
        if args.preflight:
            child = subprocess.check_output([sys.executable, '-c',
                    "import ctypes; print(ctypes.WinDLL('kernel32').GetErrorMode())"], text=True,
                    creationflags=subprocess.CREATE_NO_WINDOW, timeout=10)
            inherited = int(child.strip())
            assert inherited & 0x8003 == 0x8003, ('Child did not inherit error mode', inherited)
            print(json.dumps({'pass': True, 'phase': 'preflight', 'token': state,
                              'errorMode': mode, 'childErrorMode': inherited, 'htmlSha256': digest}))
            return 0
        prefix.parent.mkdir(parents=True, exist_ok=True)
        report = Path(str(prefix) + '.json')
        env = {key.upper(): value for key, value in os.environ.items()}
        env.pop('ELECTRON_RUN_AS_NODE', None)
        env['GEMSTOGETHER_SMOKE_REPORT'] = str(report)
        started = time.time_ns()
        with Path(str(prefix) + '.stdout.log').open('w', encoding='utf-8') as stdout, \
             Path(str(prefix) + '.stderr.log').open('w', encoding='utf-8') as stderr:
            process = subprocess.Popen([str(exe), '--smoke'], cwd=exe.parent, env=env,
                        stdout=stdout, stderr=stderr, creationflags=subprocess.CREATE_NO_WINDOW)
            try:
                code = process.wait(timeout=45)
            except subprocess.TimeoutExpired:
                subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10,
                               creationflags=subprocess.CREATE_NO_WINDOW, check=False)
                if process.poll() is None:
                    process.kill()
                process.wait(timeout=10)
                raise RuntimeError('Native check timed out; its owned process tree was stopped.')
        if code:
            raise RuntimeError(f'Native smoke exited 0x{code & 0xffffffff:08x}; see {prefix}.stderr.log')
        if not report.is_file() or report.stat().st_mtime_ns < started:
            raise RuntimeError('Native check did not produce a fresh receipt.')
        receipt = json.loads(report.read_text(encoding='utf-8'))
        expected = json.loads((root / 'desktop/package.json').read_text(encoding='utf-8'))['version']
        if not receipt.get('pass') or receipt.get('version') != expected or receipt.get('desktop', {}).get('version') != expected:
            raise RuntimeError('Native receipt failed or reports another build: ' + str(receipt))
        receipt['launcher'] = {'token': state, 'errorMode': mode, 'htmlSha256': digest, 'pid': process.pid}
        report.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
        print(json.dumps({key: receipt[key] for key in ['pass', 'version', 'backend', 'errors', 'musicFilter', 'comboTreatment', 'launcher']}))
        return 0
    finally:
        kernel.SetErrorMode(prior)


if __name__ == '__main__':
    sys.exit(main())
