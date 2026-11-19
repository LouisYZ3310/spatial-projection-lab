import { lineProjection, planeProjection, planes, validate } from './geometry.mjs';
import { construction, defaultVertices, examples, make, relations, types } from './examples.mjs';
import { lineSwatch, lineTypes, renderDrawing, renderLineSample, renderMethod, renderSpatial, renderTraces } from './diagrams.mjs';

const $ = id => document.getElementById(id);
const all = selector => [...document.querySelectorAll(selector)];
const storageKey = 'projection-lab.custom.v1';
const desktop = location.protocol === 'projection-lab:';
const maxShapes = 10;
const initialView = { azimuth: 35, elevation: 26 };
const box = examples.solid[0].shapes[0];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const state = {
  mode: 'unfold',
  exampleId: 'unfold',
  ...initialView,
  angle: 0,
  selected: 'A',
  rays: true,
  axes: true,
  guide: true,
  hiddenEdges: true,
  reveal: false,
  step: 0,
  method: 'orthogonal',
  height: 130,
  tilt: 34,
  lineType: 'thick',
  custom: readCustom(),
};
let animationFrame = 0;
let workingScene;
let pendingEdits = new Map();

function currentExample() {
  return examples[state.mode].find(example => example.id === state.exampleId);
}

function loadScene() {
  const example = currentExample();
  const shapes = [...(example?.shapes ?? state.custom)];
  if (example?.id === 'plane-construct') shapes.push(...construction.slice(0, state.step));
  if (relations[example?.id]) shapes.push(...relations[example.id]);
  const vertices = shapes.flatMap(shape => shape.labels.map((label, index) => ({ label, point: shape.vertices[index], shape })));
  if (!vertices.some(entry => entry.label === state.selected)) state.selected = vertices[0]?.label ?? null;
  workingScene = { shapes, vertices };
}

function displayScene() {
  const { shapes, vertices } = workingScene;
  renderDrawing($('drawing'), shapes, vertices, state);
  renderSpatial($('spatial'), shapes, vertices, state);
}

function number(value, decimals = 1) {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: decimals, useGrouping: false }).format(value);
}

function readings() {
  const { shapes, vertices } = workingScene;
  const chosen = vertices.find(vertex => vertex.label === state.selected);
  const shape = state.mode === 'custom' ? chosen?.shape ?? shapes[0] : shapes[0];
  $('readings').innerHTML = Object.entries(planes).map(([plane, meta]) => {
    let value = '—';
    if (state.exampleId === 'point-third' && plane === 'W' && !state.reveal) {
      value = '待求 · (y, z)';
    } else if (shape?.kind === 'line') {
      const result = lineProjection(shape.vertices, plane);
      value = `${number(result.projected)} / ${number(result.actual)} · ${result.kind}`;
    } else if (shape && ['triangle', 'polygon'].includes(shape.kind)) {
      const result = planeProjection(shape.vertices, plane);
      value = `${result.kind} · 面积 ${number(result.ratio * 100)}%`;
    } else if (shape?.kind === 'solid') {
      value = state.hiddenEdges ? '粗实线 / 细虚线' : '仅可见棱';
    } else if (chosen) {
      const projected = chosen.point.filter((_, index) => index !== meta.axis);
      value = `(${projected.map(n => number(n, 3)).join(', ')}) · ${meta.coordinates}`;
    }
    return `<div class="reading ${plane.toLowerCase()}" data-reading="${plane}"><strong>${plane} · ${meta.name}</strong><span>${value}</span></div>`;
  }).join('');
  $('selected-coordinates').textContent = chosen ? `${chosen.label} (${chosen.point.map(n => number(n, 3)).join(', ')})` : '';
}

function vertexButtons() {
  const { vertices } = workingScene;
  $('selection').hidden = !vertices.length;
  $('vertex-buttons').innerHTML = vertices.map(({ label }) =>
    `<button type="button" data-vertex="${label}" aria-label="追踪顶点 ${label}" aria-pressed="${label === state.selected}">${label}</button>`).join('');
}

function selectVertex(label) {
  if (!workingScene.vertices.some(entry => entry.label === label)) return;
  state.selected = label;
  for (const button of all('#vertex-buttons button')) button.setAttribute('aria-pressed', String(button.dataset.vertex === label));
  displayScene();
  readings();
}

function renderLessonAction() {
  const element = $('lesson-actions');
  if (state.exampleId === 'point-third') {
    element.innerHTML = `<button type="button" class="outline" id="reveal" aria-pressed="${state.reveal}">${state.reveal ? '隐藏侧面投影' : '显示侧面投影'}</button>`;
  } else if (state.exampleId === 'plane-construct') {
    const label = ['在面上取线 MN', '在线上取点 K', '重做构造'][state.step];
    const caption = ['起点：三角形 ABC', 'M 在 AB 上，N 在 AC 上', 'K 在 MN 上，也在面 ABC 上'][state.step];
    element.innerHTML = `<button type="button" class="outline" id="construct">${label}</button><span class="reference">${caption}</span>`;
  } else {
    element.replaceChildren();
  }
}

function updateLesson() {
  const example = currentExample();
  $('lesson-description').textContent = example?.description ?? '添加图形并修改坐标，同时观察空间图和三个投影。';
  $('lesson-pages').textContent = example?.pages ?? '';
  $('lesson-pages').hidden = !example;
  $('lesson-pages').dataset.example = example?.id ?? 'custom';
  $('hidden-toggle').hidden = !workingScene.shapes.some(shape => shape.kind === 'solid');
  vertexButtons();
  readings();
  renderLessonAction();
}

function setExample(exampleId) {
  state.exampleId = exampleId;
  state.reveal = false;
  state.step = 0;
  state.selected = null;
  if (exampleId === 'point-third') {
    state.guide = true;
    state.rays = true;
    $('show-guide').checked = true;
    $('show-rays').checked = true;
  }
  loadScene();
  updateLesson();
  displayScene();
}

function setMode(mode) {
  state.mode = mode;
  for (const button of all('[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
  $('editor').hidden = mode !== 'custom';
  $('copy-example').textContent = mode === 'custom' ? '＋ 编辑自定义场景' : '＋ 将图形加入自定义场景';
  const options = examples[mode];
  $('example-select').parentElement.hidden = options.length === 0;
  $('example-select').replaceChildren(...options.map(example => new Option(example.name, example.id)));
  setExample(options[0]?.id ?? 'custom');
  if (mode === 'custom') renderEditor();
}

function applyAngle(value) {
  state.angle = value;
  const rounded = Math.round(value);
  $('unfold-angle').value = rounded;
  $('angle-value').value = `${rounded}°`;
  $('space-hint').textContent = value === 0 ? '拖动空间图旋转视角' : value === 90 ? '已展开到同一平面 · 对照右侧三视图' : 'V 固定 · H 绕 OX 向下 · W 绕 OZ 向外';
  $('camera-reset').disabled = value > 0;
  $('close-fold').disabled = value === 0 && !animationFrame;
  $('play-fold').disabled = value === 90 && !animationFrame;
  const { shapes, vertices } = workingScene;
  renderSpatial($('spatial'), shapes, vertices, state);
}

function stopAnimation() {
  cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  $('play-fold').innerHTML = '<span aria-hidden="true">▷</span> 播放展开';
}

function animateAngle(target) {
  stopAnimation();
  if (reducedMotion.matches || target === state.angle) {
    applyAngle(target);
    return;
  }
  const start = state.angle;
  const duration = Math.max(260, Math.abs(target - start) * 17);
  const started = performance.now();
  if (target === 90) $('play-fold').textContent = '暂停';
  const tick = now => {
    const progress = Math.min((now - started) / duration, 1);
    const eased = progress * progress * (3 - 2 * progress);
    if (progress === 1) stopAnimation();
    applyAngle(start + (target - start) * eased);
    if (progress < 1) animationFrame = requestAnimationFrame(tick);
  };
  animationFrame = requestAnimationFrame(tick);
  $('play-fold').disabled = target === 0;
  $('close-fold').disabled = target === 0;
}

function restoreCamera() {
  Object.assign(state, initialView);
  displayScene();
}

function connectOrbit() {
  const svg = $('spatial');
  let drag;
  svg.addEventListener('pointerdown', event => {
    if (state.angle !== 0 || event.button !== 0 || event.target.closest('[data-vertex]')) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId || state.angle !== 0) return;
    changeOrbit((event.clientX - drag.x) * .45, (drag.y - event.clientY) * .42);
    drag.x = event.clientX;
    drag.y = event.clientY;
  });
  svg.addEventListener('lostpointercapture', () => { drag = null; });
  svg.addEventListener('keydown', event => {
    if (state.angle !== 0) return;
    const step = { ArrowUp: [0, 7], ArrowDown: [0, -7], ArrowLeft: [-9, 0], ArrowRight: [9, 0] }[event.key];
    if (!step) return;
    event.preventDefault();
    changeOrbit(...step);
  });
}

function changeOrbit(azimuth, elevation) {
  state.azimuth = ((state.azimuth + azimuth + 540) % 360) - 180;
  state.elevation = Math.max(-75, Math.min(80, state.elevation + elevation));
  const { shapes, vertices } = workingScene;
  renderSpatial($('spatial'), shapes, vertices, state);
}

function readCustom() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    if (!Array.isArray(saved)) return [];
    const ids = new Set();
    const labels = new Set();
    const shapes = [];
    for (const shape of saved.slice(0, maxShapes)) {
      if (!shape || !/^[a-z0-9-]{1,48}$/.test(shape.id) || ids.has(shape.id)) continue;
      if (shape.kind === 'solid') {
        shapes.push({ ...structuredClone(box), id: shape.id });
        ids.add(shape.id);
        continue;
      }
      if (validate(shape.kind, shape.vertices) || !Array.isArray(shape.labels)
          || shape.labels.length !== shape.vertices.length || new Set(shape.labels).size !== shape.labels.length
          || shape.labels.some(label => !/^[A-Z][0-9]{0,2}$/.test(label) || labels.has(label))) continue;
      shapes.push(make(shape.id, shape.kind, shape.vertices, shape.labels));
      ids.add(shape.id);
      shape.labels.forEach(label => labels.add(label));
    }
    return shapes;
  } catch {
    return [];
  }
}

function saveCustom(message) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state.custom));
    $('editor-notice').textContent = message;
  } catch {
    $('editor-notice').textContent = `${message} ${desktop ? '桌面程序' : '浏览器'}无法保存，刷新会清除当前场景。`;
  }
}

function nextLabels(count) {
  const taken = new Set(state.custom.flatMap(shape => shape.labels));
  const labels = [];
  for (let i = 0; labels.length < count; i++) {
    const row = Math.floor(i / 26);
    const label = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i % 26] + (row === 0 ? '' : row);
    if (!taken.has(label)) labels.push(label);
  }
  return labels;
}

function addShape(shape) {
  if (state.custom.length >= maxShapes) return null;
  const id = crypto.randomUUID();
  const labels = shape.kind === 'solid' ? [] : nextLabels(shape.vertices.length);
  const newShape = make(id, shape.kind, structuredClone(shape.vertices), labels, structuredClone(shape.faces));
  state.custom.push(newShape);
  return newShape;
}

function editorRefresh() {
  loadScene();
  updateLesson();
  displayScene();
  renderEditor();
}

function renderEditor() {
  const editor = $('shape-editor');
  editor.innerHTML = state.custom.map(shape => {
    const vertices = pendingEdits.get(shape.id) ?? shape.vertices;
    const grid = shape.kind === 'solid' ? '<p class="shape-status">课件示例 · 固定几何</p>' : `
      <div class="coordinate-grid">
        <span></span><span>x</span><span>y</span><span>z</span>
        ${vertices.map((point, i) => `<label>${shape.labels[i]}</label>${point.map((value, axis) => {
          const axisName = 'xyz'[axis];
          return `<input type="number" min="0" max="100" step="any" data-index="${i}" data-axis="${axis}" aria-label="${shape.labels[i]} 的 ${axisName} 坐标" aria-describedby="warning-${shape.id}" value="${value}">`;
        }).join('')}`).join('')}
      </div>
      <p class="shape-status" id="warning-${shape.id}" aria-live="polite"></p>`;
    return `<div class="shape-form" data-shape-id="${shape.id}">
      <div class="shape-title"><strong>${types[shape.kind]} ${shape.labels.join('')}</strong>
      <button class="quiet remove" type="button" data-remove="${shape.id}" aria-label="删除${types[shape.kind]} ${shape.labels.join('')}">删除</button></div>
      ${grid}
    </div>`;
  }).join('');
  for (const form of all('.shape-form')) {
    const shape = state.custom.find(item => item.id === form.dataset.shapeId);
    if (pendingEdits.has(shape.id)) showCoordinateError(form, validate(shape.kind, pendingEdits.get(shape.id)));
  }
  if (!state.custom.length && !$('editor-notice').textContent) $('editor-notice').textContent = '场景还是空的。选一种图形，点击「添加图形」开始。';
}

function showCoordinateError(form, error) {
  const message = form.querySelector('.shape-status');
  message.classList.toggle('error', !!error);
  message.textContent = error || '坐标已更新';
  for (const input of form.querySelectorAll('input')) input.setAttribute('aria-invalid', String(!!error));
}

function editCoordinate(event) {
  const input = event.target.closest('input[data-index]');
  if (!input) return;
  const form = input.closest('.shape-form');
  const shape = state.custom.find(item => item.id === form.dataset.shapeId);
  const vertices = shape.vertices.map(point => [...point]);
  for (const coordinate of form.querySelectorAll('input')) {
    vertices[Number(coordinate.dataset.index)][Number(coordinate.dataset.axis)] = coordinate.valueAsNumber;
  }
  const error = validate(shape.kind, vertices);
  showCoordinateError(form, error);
  if (error) {
    // Keep editable drafts separate from the valid geometry and saved scene.
    pendingEdits.set(shape.id, vertices.map(point => point.map(value => Number.isFinite(value) ? value : '')));
    $('editor-notice').textContent = '视图仍显示该图形上一组有效坐标。';
    return;
  }
  pendingEdits.delete(shape.id);
  shape.vertices = vertices;
  state.selected = shape.labels[Number(input.dataset.index)];
  saveCustom('坐标已更新。');
  loadScene();
  displayScene();
  readings();
  vertexButtons();
}

function focusEditor() {
  $('editor').scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  $('shape-kind').focus({ preventScroll: true });
}

function copyCurrent() {
  if (state.mode === 'custom') {
    focusEditor();
    return;
  }
  const source = currentExample().shapes;
  if (source.length + state.custom.length > maxShapes) {
    saveCustom(`自定义场景最多容纳 ${maxShapes} 个图形。删除不需要的图形后可继续添加。`);
    setMode('custom');
    focusEditor();
    return;
  }
  const copies = source.map(addShape);
  saveCustom(`已加入 ${copies.length} 个图形。`);
  setMode('custom');
  focusEditor();
}

const methodTexts = {
  central: ['投射线汇聚于 S', '投射线从同一投射中心出发。调低中心，比较物体各顶点到中心的距离如何改变投影。'],
  orthogonal: ['投射线互相平行，并垂直于 H 面', '三面实验采用这种投影。每个空间点沿 H 面的法线下落，保留 x、y，舍去高度 z。'],
  oblique: ['投射线互相平行，并斜交于 H 面', '把投射线从垂线方向倾斜。顶点离 H 面越高，投影点横向移动越多。'],
};

function updateMethod() {
  const [heading, detail] = methodTexts[state.method];
  $('method-relationship').textContent = heading;
  $('method-description').textContent = detail;
  for (const button of all('[data-method]')) button.setAttribute('aria-pressed', String(button.dataset.method === state.method));
  const central = state.method === 'central';
  const amount = central ? state.height : state.tilt;
  $('method-slider').hidden = state.method === 'orthogonal';
  $('method-amount-label').textContent = central ? '中心高度' : '与垂线夹角';
  $('method-amount').min = central ? 90 : 5;
  $('method-amount').max = central ? 190 : 55;
  $('method-amount').value = amount;
  $('method-amount-value').value = `${amount}${central ? '' : '°'}`;
  renderMethod($('method-diagram'), state.method, amount);
}

function updateLineType() {
  for (const button of all('[data-line-type]')) button.setAttribute('aria-pressed', String(button.dataset.lineType === state.lineType));
  $('line-name').textContent = lineTypes[state.lineType].name;
  $('line-description').textContent = lineTypes[state.lineType].text;
  renderLineSample($('line-preview'), state.lineType);
}

for (const button of all('[data-mode]')) button.addEventListener('click', () => setMode(button.dataset.mode));
$('example-select').addEventListener('change', event => setExample(event.target.value));
$('copy-example').addEventListener('click', copyCurrent);
$('unfold-angle').addEventListener('input', event => { stopAnimation(); applyAngle(event.target.valueAsNumber); });
$('play-fold').addEventListener('click', () => {
  if (animationFrame) {
    stopAnimation();
    applyAngle(state.angle);
  } else {
    animateAngle(90);
  }
});
$('close-fold').addEventListener('click', () => animateAngle(0));
$('camera-reset').addEventListener('click', restoreCamera);
$('lesson-actions').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.id === 'reveal') state.reveal = !state.reveal;
  if (button.id === 'construct') {
    state.step = (state.step + 1) % 3;
    state.selected = [null, 'M', 'K'][state.step];
  }
  loadScene();
  updateLesson();
  displayScene();
  $(button.id)?.focus();
});

const toggles = { 'show-rays': 'rays', 'show-axes': 'axes', 'show-guide': 'guide', 'show-hidden': 'hiddenEdges' };
for (const [id, key] of Object.entries(toggles)) {
  $(id).addEventListener('change', event => {
    state[key] = event.target.checked;
    displayScene();
    if (key === 'hiddenEdges') readings();
  });
}

for (const id of ['spatial', 'drawing', 'vertex-buttons']) {
  $(id).addEventListener('click', event => {
    const vertex = event.target.closest('[data-vertex]');
    if (vertex) selectVertex(vertex.dataset.vertex);
  });
}

$('shape-kind').addEventListener('change', event => {
  $('shape-count').hidden = event.target.value !== 'polygon';
});
$('add-shape').addEventListener('submit', event => {
  event.preventDefault();
  const kind = $('shape-kind').value;
  const vertices = defaultVertices[kind](Number($('shape-count').value));
  const shape = addShape({ kind, vertices });
  if (!shape) {
    $('editor-notice').textContent = `自定义场景最多容纳 ${maxShapes} 个图形。`;
    return;
  }
  state.selected = shape.labels[0];
  saveCustom(`已添加${types[kind]} ${shape.labels.join('')}。`);
  editorRefresh();
  document.querySelector(`[data-shape-id="${shape.id}"] input`)?.focus();
});
$('shape-editor').addEventListener('input', editCoordinate);
$('shape-editor').addEventListener('click', event => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  state.custom = state.custom.filter(shape => shape.id !== button.dataset.remove);
  pendingEdits.delete(button.dataset.remove);
  saveCustom('已删除图形。');
  editorRefresh();
  $('shape-kind').focus();
});
$('show-traces').addEventListener('change', event => renderTraces($('traces'), event.target.checked));
for (const button of all('[data-method]')) {
  button.addEventListener('click', () => {
    state.method = button.dataset.method;
    updateMethod();
  });
}
$('method-amount').addEventListener('input', event => {
  const amount = event.target.valueAsNumber;
  if (state.method === 'central') state.height = amount;
  if (state.method === 'oblique') state.tilt = amount;
  updateMethod();
});
$('line-buttons').innerHTML = Object.entries(lineTypes).map(([id, style]) =>
  `<button type="button" data-line-type="${id}" aria-pressed="false"><svg viewBox="0 0 90 22" aria-hidden="true">${lineSwatch(id, 3, 11, 84)}</svg><span>${style.name}</span></button>`).join('');
$('line-buttons').addEventListener('click', event => {
  const button = event.target.closest('[data-line-type]');
  if (!button) return;
  state.lineType = button.dataset.lineType;
  updateLineType();
});
$('inspect-solid').addEventListener('click', () => setMode('solid'));

if (desktop) $('storage-location').textContent = '在当前电脑的桌面程序中保存。';
setMode('unfold');
applyAngle(0);
connectOrbit();
updateMethod();
updateLineType();
renderTraces($('traces'), true);
