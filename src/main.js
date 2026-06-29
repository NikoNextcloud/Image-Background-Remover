import './style.css';
import { removeBackground } from '@imgly/background-removal';

const MAX_SIZE = 20 * 1024 * 1024;
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

const el = Object.fromEntries([
  'uploadView', 'editorView', 'dropZone', 'chooseBtn', 'fileInput', 'newImageBtn',
  'fileName', 'beforeImage', 'afterImage', 'emptyResult', 'processing', 'progressText',
  'progressBar', 'statusText', 'removeBtn', 'downloadBtn'
].map(id => [id, document.getElementById(id)]));

let selectedFile = null;
let sourceUrl = '';
let resultUrl = '';

el.chooseBtn.addEventListener('click', event => {
  event.stopPropagation();
  el.fileInput.click();
});
el.dropZone.addEventListener('click', () => el.fileInput.click());
el.dropZone.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') el.fileInput.click();
});
el.fileInput.addEventListener('change', () => loadFile(el.fileInput.files[0]));
el.newImageBtn.addEventListener('click', resetApp);
el.removeBtn.addEventListener('click', processImage);
el.downloadBtn.addEventListener('click', downloadResult);

['dragenter', 'dragover'].forEach(type => el.dropZone.addEventListener(type, event => {
  event.preventDefault();
  el.dropZone.classList.add('dragging');
}));
['dragleave', 'drop'].forEach(type => el.dropZone.addEventListener(type, event => {
  event.preventDefault();
  el.dropZone.classList.remove('dragging');
}));
el.dropZone.addEventListener('drop', event => loadFile(event.dataTransfer.files[0]));

function loadFile(file) {
  if (!file) return;
  if (!allowedTypes.includes(file.type)) return showUploadError('Моля, изберете JPG, PNG или WebP изображение.');
  if (file.size > MAX_SIZE) return showUploadError('Снимката е по-голяма от 20 MB. Изберете по-малък файл.');

  cleanupUrls();
  selectedFile = file;
  sourceUrl = URL.createObjectURL(file);
  el.beforeImage.src = sourceUrl;
  el.fileName.textContent = file.name;
  el.uploadView.classList.add('hidden');
  el.editorView.classList.remove('hidden');
  el.afterImage.classList.add('hidden');
  el.emptyResult.classList.remove('hidden');
  el.downloadBtn.classList.add('hidden');
  el.statusText.textContent = 'Готово за обработване';
  window.scrollTo({ top: document.getElementById('workspace').offsetTop - 24, behavior: 'smooth' });
}

async function processImage() {
  if (!selectedFile || el.removeBtn.disabled) return;
  setProcessing(true);

  try {
    const blob = await removeBackground(selectedFile, {
      model: 'isnet_quint8',
      output: { format: 'image/png', quality: 1 },
      progress: (key, current, total) => {
        const percent = total ? Math.min(100, Math.round((current / total) * 100)) : 0;
        el.progressText.textContent = key.includes('fetch') ? `Изтегляне на AI модела… ${percent}%` : 'Премахване на фона…';
        el.progressBar.style.width = `${Math.max(8, percent)}%`;
      }
    });

    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = URL.createObjectURL(blob);
    el.afterImage.src = resultUrl;
    el.afterImage.classList.remove('hidden');
    el.emptyResult.classList.add('hidden');
    el.downloadBtn.classList.remove('hidden');
    el.statusText.textContent = 'Фонът е премахнат успешно';
    el.removeBtn.innerHTML = '<span>✓</span> Обработено';
  } catch (error) {
    console.error(error);
    el.statusText.textContent = 'Неуспешно обработване. Проверете връзката и опитайте отново.';
    el.removeBtn.innerHTML = '<span>↻</span> Опитай отново';
  } finally {
    setProcessing(false);
  }
}

function setProcessing(active) {
  el.removeBtn.disabled = active;
  el.newImageBtn.disabled = active;
  el.processing.classList.toggle('hidden', !active);
  if (active) {
    el.emptyResult.classList.add('hidden');
    el.afterImage.classList.add('hidden');
    el.downloadBtn.classList.add('hidden');
    el.statusText.textContent = 'Обработване на изображението…';
    el.removeBtn.innerHTML = '<span>✦</span> Обработване…';
    el.progressBar.style.width = '8%';
  }
}

function downloadResult() {
  if (!resultUrl) return;
  const link = document.createElement('a');
  const base = selectedFile.name.replace(/\.[^/.]+$/, '');
  link.href = resultUrl;
  link.download = `${base}-bez-fon.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function resetApp() {
  cleanupUrls();
  selectedFile = null;
  el.fileInput.value = '';
  el.editorView.classList.add('hidden');
  el.uploadView.classList.remove('hidden');
  el.removeBtn.innerHTML = '<span>✦</span> Премахни фона';
  el.removeBtn.disabled = false;
}

function cleanupUrls() {
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  sourceUrl = '';
  resultUrl = '';
}

function showUploadError(message) {
  const note = el.dropZone.querySelector('.file-note');
  note.textContent = message;
  note.classList.add('error');
  setTimeout(() => {
    note.textContent = 'JPG, PNG или WebP · до 20 MB';
    note.classList.remove('error');
  }, 4500);
}

window.addEventListener('beforeunload', cleanupUrls);
