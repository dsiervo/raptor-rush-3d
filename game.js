(async () => {
  try {
    const files = ['game-1.js', 'game-2.js', 'game-3.js'];
    const parts = await Promise.all(files.map(async (file) => {
      const response = await fetch(file);
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
