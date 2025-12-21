console.log("Script loaded!");

window.addEventListener('load', () => {
    console.log("Page loaded!");
    
    const canvas = document.getElementById('gameCanvas');
    console.log("Canvas element:", canvas);
    
    if (!canvas) {
        document.body.innerHTML = '<h1 style="color: red;">ERROR: Canvas not found!</h1>';
        return;
    }
    
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;
    
    // Draw a test square
    ctx.fillStyle = 'red';
    ctx.fillRect(100, 100, 100, 100);
    
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.fillText('Test - Can you see this?', 200, 300);
    
    console.log("Test drawing complete!");
});
