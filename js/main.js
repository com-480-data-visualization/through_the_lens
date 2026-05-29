window.addEventListener('resize',()=>{
  resizeExp();resizeGear();resizeLens();resizeSankey();paResize();
});
setTimeout(()=>{resizeExp();resizeGear();resizeSankey();},80);
