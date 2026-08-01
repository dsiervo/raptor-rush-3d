(async () => {
  try {
    const version = '20260801-3d3';
    const files = ['game-1.js', 'game-2.js', 'game-3.js'];
    const parts = await Promise.all(files.map(async (file) => {
      const response = await fetch(`${file}?v=${version}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`No se pudo cargar ${file}`);
      return response.text();
    }));
    new Function(parts.join('\n'))();
  } catch (error) {
    console.error(error);
    const panel = document.getElementById('webgl-error');
    if (panel) panel.classList.add('visible');
  }
})();
