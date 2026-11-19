import {
  planes, camera, cast, dot, edgesForSolid, epsilon, flat, length, planeProjection,
  project, span, sub, trace, unfold,
} from './geometry.mjs';
import { traceTriangle } from './examples.mjs';

const palette = {
  V: { ink: '#3159c8', fill: '#e1e9ff', frame: '#89a0de' },
  H: { ink: '#187866', fill: '#deefe9', frame: '#82b7a8' },
  W: { ink: '#8c4ea6', fill: '#eee0f6', frame: '#b79aca' },
};
const ink = '#253956';
const model = '#ac442e';
const rayInk = '#6a83b0';
const selectedInk = '#1748b8';
const origin = [0, 0, 0];
const chartSize = [520, 386];
const chartOrigin = [260, 193];
const chartScale = 1.52;
const extent = 100;
const viewNames = Object.keys(planes);
const planeCorners = {
  V: [origin, [extent, 0, 0], [extent, 0, extent], [0, 0, extent]],
  H: [origin, [extent, 0, 0], [extent, extent, 0], [0, extent, 0]],
  W: [origin, [0, extent, 0], [0, extent, extent], [0, 0, extent]],
};
const normalToward = { V: [0, 1, 0], H: [0, 0, 1], W: [1, 0, 0] };
const position = ([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`;
const stroke = (color, width, other = '') => `stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${other}`;
const seg = (a, b, attrs) => `<path d="M${position(a)} L${position(b)}" fill="none" ${attrs}/>`;
const wire = (points, attrs, closed = false) => `<path d="M${points.map(position).join(' L')}${closed ? ' Z' : ''}" ${attrs}/>`;
const circle = ([x, y], r, attrs) => `<circle cx="${x}" cy="${y}" r="${r}" ${attrs}/>`;
const text = ([x, y], value, color = ink, size = 12, align = 'start') =>
  `<text x="${x}" y="${y}" text-anchor="${align}" fill="${color}" font-size="${size}" font-weight="650">${value}</text>`;
const shift = ([x, y], dx, dy) => [x + dx, y + dy];
const drawingMap = point => shift(chartOrigin, ...point.map(value => value * chartScale));
const thin = stroke(rayInk, 1.05);
const lower = label => label.toLowerCase();
const hidden = (state, plane) => state.exampleId === 'point-third' && plane === 'W' && !state.reveal;

function fitter(points, map, [width, height], pad = [62, 46]) {
  const samples = points.map(map);
  const xs = samples.map(p => p[0]);
  const ys = samples.map(p => p[1]);
  const low = [Math.min(...xs), Math.min(...ys)];
  const high = [Math.max(...xs), Math.max(...ys)];
  const zoom = Math.min((width - pad[0] * 2) / Math.max(1, high[0] - low[0]),
    (height - pad[1] * 2) / Math.max(1, high[1] - low[1]));
  return point => {
    const [x, y] = map(point);
    return [width / 2 + (x - (low[0] + high[0]) / 2) * zoom,
      height / 2 + (y - (low[1] + high[1]) / 2) * zoom];
  };
}

function renderShape(shape, map, { plane, toward, inkColor, active = false, opacity = 1, showHidden = true, fill = null, projected = false }) {
  const points = shape.vertices.map(map);
  const attrs = stroke(inkColor, projected ? 2.3 : (active ? 2.6 : 2.1));
  let content;
  if (shape.kind === 'solid') {
    content = edgesForSolid(shape, toward).filter(edge => edge.visible || showHidden).map(({ pair: [a, b], visible }) => {
      if (length(sub(points[a], points[b])) < .001) return '';
      const width = visible ? 2.4 : 1.2;
      const detail = visible ? 'data-edge="visible"' : 'data-edge="hidden" stroke-dasharray="6 4"';
      return seg(points[a], points[b], stroke(inkColor, width, detail));
    }).join('');
  } else if (shape.kind === 'point' || (shape.kind === 'line' && length(sub(points[0], points[1])) < .001)) {
    content = circle(points[0], 3.1, `fill="${inkColor}"`);
  } else if (shape.kind === 'line') {
    content = seg(...points, attrs);
  } else if (plane && planeProjection(shape.vertices, plane).kind === '积聚成线') {
    content = seg(...span(points), `${attrs} data-accumulated="line"`);
  } else {
    content = wire(points, `fill="${fill ?? '#d0dcff'}" fill-opacity="${projected ? .47 : .32}" ${attrs}`, true);
  }
  return `<g opacity="${opacity}">${content}</g>`;
}

function pointMarkers(entries, map, { plane, selected, opacity = 1, dim = false } = {}) {
  const groups = new Map();
  for (const entry of entries) {
    const coord = map(entry.point);
    const key = coord.map(value => value.toFixed(4)).join(',');
    const group = groups.get(key) ?? [];
    group.push({ ...entry, coord });
    groups.set(key, group);
  }
  // Coordinates coinciding in an orthographic view are ordered from observer to plane.
  const labels = [];
  for (const group of groups.values()) {
    if (plane) group.sort((a, b) => b.point[planes[plane].axis] - a.point[planes[plane].axis]);
    else if (group.length > 1 && group.some(entry => entry.label === selected)) {
      group.sort((a, b) => Number(b.label === selected) - Number(a.label === selected));
    }
    const front = group[0];
    const active = group.some(entry => entry.label === selected);
    const suffix = plane ? planes[plane].suffix : '';
    const samples = group.map(entry => plane ? lower(entry.label) + suffix : entry.label);
    const label = samples.length > 1 ? `${samples[0]}(${samples.slice(1).join(',')})` : samples[0];
    if (!dim || active) labels.push({ front, active, label });
  }
  labels.sort((a, b) => Number(a.active) - Number(b.active));
  return labels.map(({ front, active, label }) => {
    const { coord, label: id } = front;
    const color = active ? selectedInk : plane ? palette[plane].ink : model;
    const placeLeft = coord[0] > 375 && label.length > 5;
    const align = placeLeft ? 'end' : 'start';
    const target = shift(coord, placeLeft ? -8 : 8, -8);
    const title = plane ? `${plane} 面 · ${label}` : `空间点 ${id}`;
    return `<g opacity="${opacity}">${active ? circle(coord, 8, `fill="white" ${stroke(color, 1.5)}`) : ''}
      ${circle(coord, active ? 3.45 : 2.55, `fill="${color}" stroke="white" stroke-width=".75"`)}
      ${text(target, label, color, 12, align)}
      <circle class="point-hit" data-vertex="${id}" ${active ? 'data-highlight="true"' : ''} ${plane ? `data-plane="${plane}"` : ''} cx="${coord[0]}" cy="${coord[1]}" r="11" fill="transparent"><title>${title}</title></circle>
    </g>`;
  }).join('');
}

function flatAxes(map) {
  const axes = stroke('#8293ad', 1.12);
  return seg(map([-109, 0]), map([109, 0]), axes) + seg(map([0, -109]), map([0, 109]), axes)
    + text(shift(map([-109, 0]), -8, 4), 'X', ink, 12, 'end')
    + text(shift(map([0, -109]), 0, -7), 'Z', ink, 12, 'middle')
    + text(shift(map([109, 0]), 8, 4), 'Yᵂ')
    + text(shift(map([0, 109]), 0, 16), 'Yᴴ', ink, 12, 'middle')
    + text(shift(map([0, 0]), 6, -7), 'O', ink, 11);
}

function viewLabel(coords, plane) {
  return `<g>${text(coords, plane, palette[plane].ink, 17)}
    <text x="${coords[0] + 21}" y="${coords[1] - 1}" fill="${palette[plane].ink}" font-size="11" font-weight="650">${planes[plane].view}</text></g>`;
}

function directionGuides(vertex, state) {
  const a = drawingMap(flat(vertex, 'V'));
  const b = drawingMap(flat(vertex, 'H'));
  const c = drawingMap(flat(vertex, 'W'));
  const miter = drawingMap([vertex[1], vertex[1]]);
  let result = '';
  if (state.rays) {
    result += seg(a, b, thin) + seg(a, c, thin);
    const foot = [a[0], chartOrigin[1]];
    result += circle(foot, 2.1, 'fill="#738ab5"');
  }
  if (state.guide) {
    result += seg(b, miter, thin) + seg(miter, c, thin) + circle(miter, 3, 'fill="#6082bc"');
  }
  return result;
}

export function renderDrawing(element, shapes, vertices, state) {
  const chosen = vertices.find(vertex => vertex.label === state.selected);
  const labelAnchors = { V: [-91, -86], H: [-91, 89], W: [61, -86] };
  let result = viewNames.map(plane => wire(planeCorners[plane].map(point => drawingMap(flat(point, plane))),
    `fill="${palette[plane].fill}" fill-opacity=".61" ${stroke(palette[plane].frame, 1)}`, true)).join('');
  if (state.axes) result += flatAxes(drawingMap);
  if (state.guide) {
    result += seg(drawingMap([0, 0]), drawingMap([100, 100]), stroke('#91a4c1', 1.25));
    result += text(drawingMap([78, 91]), '45°', '#4f6384');
  }
  if (chosen) result += directionGuides(chosen.point, state);

  for (const plane of viewNames) {
    result += viewLabel(drawingMap(labelAnchors[plane]), plane);
    if (hidden(state, plane)) {
      result += text(shift(drawingMap([50, -47]), 0, 0), '？', palette.W.ink, 19, 'middle');
      continue;
    }
    const map = point => drawingMap(flat(point, plane));
    result += shapes.map(shape => renderShape(shape, map, {
      plane, toward: normalToward[plane], inkColor: ink, projected: true, showHidden: state.hiddenEdges,
    })).join('');
    result += pointMarkers(vertices, map, { plane, selected: state.selected, dim: vertices.length > 12 });
  }
  element.innerHTML = result;
}

function spatialAxes(theta, transform, map) {
  const attrs = stroke('#596e90', 1.35);
  const ends = [
    { point: [109, 0, 0], plane: 'V', label: 'X', offset: [-7, 3], align: 'end' },
    { point: [0, 0, 109], plane: 'V', label: 'Z', offset: [0, -7], align: 'middle' },
    { point: [0, 109, 0], plane: 'H', label: theta === 0 ? 'Y' : 'Yᴴ', offset: [-3, 14], align: 'middle' },
  ];
  if (theta > 0) ends.push({ point: [0, 109, 0], plane: 'W', label: 'Yᵂ', offset: [8, 4], align: 'start' });
  return ends.map(({ point, plane, label, offset, align }) => {
    const end = transform(point, plane);
    return seg(map(origin), end, attrs) + text(shift(end, ...offset), label, ink, 12, align);
  }).join('') + text(shift(map(origin), 6, -7), 'O', ink, 11);
}

export function renderSpatial(element, shapes, vertices, state) {
  const theta = state.angle;
  const t = theta / 90;
  const cam = camera(state.azimuth * (1 - t), state.elevation * (1 - t));
  const planesAtAngle = Object.fromEntries(viewNames.map(plane => [
    plane, planeCorners[plane].map(point => unfold(point, plane, theta)),
  ]));
  const fit = fitter(Object.values(planesAtAngle).flat(), cam.map, chartSize, [65, 46]);
  const map = point => {
    const fitPoint = fit(point);
    const flatPoint = drawingMap(cam.map(point));
    return fitPoint.map((value, i) => (1 - t) * value + t * flatPoint[i]);
  };
  const transform = (point, plane) => map(unfold(point, plane, theta));
  const planeOrder = [...viewNames].sort((a, b) => averageDepth(planesAtAngle[a], cam) - averageDepth(planesAtAngle[b], cam));
  let result = planeOrder.map(plane => {
    const color = palette[plane];
    return wire(planesAtAngle[plane].map(map), `fill="${color.fill}" fill-opacity=".76" ${stroke(color.frame, 1.3)}`, true);
  }).join('');

  if (state.axes) result += spatialAxes(theta, transform, map);
  const spaceAnchors = { V: [91, 0, 89], H: [88, 89, 0], W: [0, 61, 95] };
  const chosen = vertices.find(vertex => vertex.label === state.selected);
  const modelOpacity = Math.max(0, 1 - theta / 54);
  if (state.rays && chosen && theta === 0) {
    result += viewNames.filter(plane => !hidden(state, plane)).map(plane =>
      seg(map(chosen.point), transform(chosen.point, plane), stroke(rayInk, 1.1, 'stroke-dasharray="4 4"'))).join('');
  }
  for (const plane of planeOrder) {
    const color = palette[plane];
    result += viewLabel(transform(spaceAnchors[plane], plane), plane);
    if (hidden(state, plane)) continue;
    const pMap = point => transform(point, plane);
    result += shapes.map(shape => renderShape(shape, pMap, {
      plane, toward: normalToward[plane], inkColor: theta === 90 ? ink : color.ink, projected: true,
      showHidden: state.hiddenEdges, fill: color.fill,
    })).join('');
    result += pointMarkers(vertices, pMap, { plane, selected: state.selected, dim: vertices.length > 12 });
  }
  if (modelOpacity) {
    result += shapes.map(shape => renderShape(shape, map, { toward: cam.toward, inkColor: model, active: true, fill: '#ed937c',
      opacity: modelOpacity, showHidden: state.hiddenEdges })).join('');
    result += pointMarkers(vertices, map, { selected: state.selected, opacity: modelOpacity, dim: vertices.length > 12 });
  }
  element.dataset.orbit = String(theta === 0);
  element.innerHTML = result;
}

function averageDepth(points, cam) {
  return points.reduce((sum, point) => sum + dot(point, cam.toward), 0) / points.length;
}

export function renderTraces(element, show) {
  const cam = camera(37, 25);
  const map = fitter(Object.values(planeCorners).flat(), cam.map, chartSize, [78, 49]);
  const ordered = [...viewNames].sort((a, b) => averageDepth(planeCorners[a], cam) - averageDepth(planeCorners[b], cam));
  let markup = ordered.map(plane => wire(planeCorners[plane].map(map),
    `fill="${palette[plane].fill}" fill-opacity=".79" ${stroke(palette[plane].frame, 1.3)}`, true)).join('');
  markup += wire(traceTriangle.map(map), `fill="#eb9b86" fill-opacity=".49" ${stroke(model, 2.4)}`, true);
  if (show) {
    for (const plane of viewNames) {
      const points = trace(traceTriangle, plane);
      if (points.length < 2) continue;
      const ends = span(points).map(map);
      const [a, b] = ends;
      markup += seg(a, b, stroke(palette[plane].ink, 2, 'stroke-dasharray="7 4"'));
      markup += text(shift(b, 3, -7), `P${plane}`, palette[plane].ink, 15);
    }
  }
  element.innerHTML = markup;
}

export function renderMethod(element, method, amount) {
  const object = [[31, 37, 32], [69, 49, 40], [44, 68, 58]];
  const corners = [[4, 3, 0], [135, 3, 0], [135, 140, 0], [4, 140, 0]];
  const rays = object.map(point => cast(point, method, amount));
  const cam = camera(35, 29);
  // A fixed frame keeps changes in projected scale easy to see while varying the method.
  const map = fitter([...corners, [30, 48, 190]], cam.map, [560, 390], [60, 35]);
  let markup = wire(corners.map(map), `fill="#dcefe9" ${stroke('#83b8ad', 1.4)}`, true);
  for (let i = 20; i <= 120; i += 20) {
    markup += seg(map([i, 3, 0]), map([i, 140, 0]), stroke('#b4d7ce', 1))
      + seg(map([4, i, 0]), map([135, i, 0]), stroke('#b4d7ce', 1));
  }
  markup += text(shift(map([131, 126, 0]), 3, 2), 'H', palette.H.ink, 20);
  markup += rays.map(ray => seg(map(ray.origin), map(ray.target), stroke('#5274b0', 1.35, 'stroke-dasharray="5 4"'))).join('');
  markup += wire(rays.map(ray => map(ray.target)), `fill="#90d6c6" fill-opacity=".57" ${stroke(palette.H.ink, 2.7)}`, true);
  markup += wire(object.map(map), `fill="#f6aa97" fill-opacity=".68" ${stroke(model, 2.7)}`, true);
  for (let i = 0; i < object.length; i++) {
    const label = 'ABC'[i];
    markup += circle(map(object[i]), 3.4, `fill="${model}"`) + text(shift(map(object[i]), 5, -8), label, model);
    markup += circle(map(rays[i].target), 3.2, `fill="${palette.H.ink}"`);
  }
  if (method === 'central') {
    const center = map(rays[0].origin);
    markup += circle(center, 4.3, 'fill="#2358c8" stroke="white" stroke-width="1.2"');
    markup += text(shift(center, 12, 4), 'S · 投射中心', '#2358c8');
  }
  element.innerHTML = markup;
}

export const lineTypes = {
  thick: { name: '粗实线', width: 'd', widthPx: 3.2, text: '画可见轮廓。长方体上看得见的棱用连续的粗实线表示。' },
  thin: { name: '细实线', width: '0.5d', widthPx: 1.6, text: '画尺寸线、尺寸界线、剖面线和辅助线等。实验里的投影对应线是辅助线。' },
  dashed: { name: '虚线', width: '0.5d', widthPx: 1.6, dash: '9 6', text: '画不可见轮廓和不可见过渡线。在长方体的三视图中，可用它标出被遮住的棱。' },
  chain: { name: '点画线', width: '0.5d', widthPx: 1.6, dash: '16 4 1 4', text: '常用来表示轴线、对称中心线，也可用来表示轨迹、节圆和节线。' },
  double: { name: '双点画线', width: '0.5d', widthPx: 1.6, dash: '16 4 1 4 1 4', text: '可表示相邻辅助零件的轮廓、运动件的极限位置，或假想投影的轮廓。' },
  wave: { name: '波浪线', width: '0.5d', widthPx: 1.6, text: '画断裂处的边界，或视图与局部剖视之间的分界。' },
  break: { name: '双折线', width: '0.5d', widthPx: 1.6, text: '画断裂处的边界，或视图与剖视之间的分界。' },
};

export function lineSwatch(kind, x, y, width) {
  const style = lineTypes[kind];
  const attrs = stroke(ink, style.widthPx, style.dash ? `stroke-dasharray="${style.dash}"` : '');
  if (kind === 'break') {
    return wire([[x, y], [x + width * .40, y], [x + width * .46, y - 8], [x + width * .53, y + 8],
      [x + width * .60, y], [x + width, y]], `fill="none" ${attrs}`);
  }
  if (kind === 'wave') {
    const wave = Array.from({ length: 9 }, (_, i) => {
      const end = (i + 1) * width / 9;
      const mid = (i + .5) * width / 9;
      return `Q${x + mid} ${y + (i % 2 ? 7 : -7)} ${x + end} ${y}`;
    });
    return `<path d="M${x} ${y} ${wave.join(' ')}" fill="none" ${attrs}/>`;
  }
  return seg([x, y], [x + width, y], attrs);
}

export function renderLineSample(element, kind) {
  element.innerHTML = lineSwatch(kind, 45, 58, 290) + text([190, 90], lineTypes[kind].width, '#50637f', 14, 'middle');
}
