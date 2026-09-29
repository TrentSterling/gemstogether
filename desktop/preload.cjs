const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('gemsDesktop',Object.freeze({
  unlock:id=>ipcRenderer.invoke('gems:achievement',id),
  fullscreen:()=>ipcRenderer.invoke('gems:fullscreen'),
  resolution:(width,height)=>ipcRenderer.invoke('gems:resolution',width,height),
  status:()=>ipcRenderer.invoke('gems:status')
}));
