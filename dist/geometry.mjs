export const planes = {
  V: { name: '正面', view: '主视图', axis: 1, coordinates: 'x, z', suffix: '′' },
  H: { name: '水平面', view: '俯视图', axis: 2, coordinates: 'x, y', suffix: '' },
  W: { name: '侧面', view: '左视图', axis: 0, coordinates: 'y, z', suffix: '″' },
};

export const add = (a, b) => a.map((value, i) => value + b[i]);
export const sub = (a, b) => a.map((value, i) => value - b[i]);
export const scale = (a, factor) => a.map(value => value * factor);
export const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
export const cross = ([x, y, z], [u, v, w]) => [y * w - z * v, z * u - x * w, x * v - y * u];
export const length = a => Math.hypot(...a);
export const lerp = (a, b, t) => add(a, scale(sub(b, a), t));
export const epsilon = 1e-7;

export function project(point, plane) {
  return point.map((value, i) => i === planes[plane].axis ? 0 : value);
}

export function flat([x, y, z], plane) {
  if (plane === 'V') return [-x, -z];
  if (plane === 'H') return [-x, y];
  return [y, -z];
}

export function unfold(point, plane, degrees) {
  const [x, y, z] = project(point, plane);
  const radians = degrees * Math.PI / 180;
  const sine = Math.sin(radians);
  const cosine = Math.cos(radians);
  if (plane === 'H') return [x, y * cosine, -y * sine];
  if (plane === 'W') return [-y * sine, y * cosine, z];
  return [x, y, z];
}

export function camera(azimuth, elevation) {
  const a = azimuth * Math.PI / 180;
  const e = elevation * Math.PI / 180;
  const right = [-Math.cos(a), Math.sin(a), 0];
  const down = [Math.sin(e) * Math.sin(a), Math.sin(e) * Math.cos(a), -Math.cos(e)];
  const toward = [Math.cos(e) * Math.sin(a), Math.cos(e) * Math.cos(a), Math.sin(e)];
  return { map: point => [dot(point, right), dot(point, down)], toward };
}

export function faceNormal(points) {
  for (let i = 1; i < points.length - 1; i++) {
    const normal = cross(sub(points[i], points[0]), sub(points[i + 1], points[0]));
    const magnitude = length(normal);
    if (magnitude > epsilon) return scale(normal, 1 / magnitude);
  }
  return null;
}

export function lineProjection(points, plane) {
  const actual = length(sub(points[1], points[0]));
  const projected = length(sub(project(points[1], plane), project(points[0], plane)));
  return { projected, actual, kind: projected <= epsilon ? '积聚成点' : actual - projected <= epsilon ? '实长' : '缩短' };
}

export function planeProjection(points, plane) {
  const normal = faceNormal(points);
  const ratio = normal ? Math.abs(normal[planes[plane].axis]) : 0;
  return { ratio, kind: ratio <= epsilon ? '积聚成线' : 1 - ratio <= epsilon ? '实形' : '类似' };
}

export function span(points) {
  let pair = [points[0], points[0]];
  let distance = 0;
  for (const a of points) {
    for (const b of points) {
      const candidate = length(sub(a, b));
      if (candidate <= distance) continue;
      pair = [a, b];
      distance = candidate;
    }
  }
  return pair;
}

export function edgesForSolid(solid, toward) {
  const center = scale(solid.vertices.reduce(add), 1 / solid.vertices.length);
  const edges = new Map();
  for (const face of solid.faces) {
    const vertices = face.map(i => solid.vertices[i]);
    const middle = scale(vertices.reduce(add), 1 / vertices.length);
    let normal = faceNormal(vertices);
    if (dot(normal, sub(middle, center)) < 0) normal = scale(normal, -1);
    const front = dot(normal, toward) > epsilon;
    face.forEach((index, i) => {
      const pair = [index, face[(i + 1) % face.length]].sort((a, b) => a - b);
      const key = pair.join('-');
      const visible = front || !!edges.get(key)?.visible;
      edges.set(key, { pair, visible });
    });
  }
  // Paint visible strokes last so that they also cover any coincident hidden strokes.
  return [...edges.values()].sort((a, b) => Number(a.visible) - Number(b.visible));
}

export function trace(points, plane) {
  const normal = faceNormal(points);
  const coefficient = dot(normal, points[0]);
  const axis = planes[plane].axis;
  const remaining = [0, 1, 2].filter(i => i !== axis);
  if (remaining.every(i => Math.abs(normal[i]) < epsilon)) return [];
  const hits = [];
  for (const fixed of remaining) {
    const variable = remaining.find(i => i !== fixed);
    if (Math.abs(normal[variable]) < epsilon) continue;
    for (const limit of [0, 100]) {
      const value = (coefficient - limit * normal[fixed]) / normal[variable];
      if (value < -epsilon || value > 100 + epsilon) continue;
      const point = [0, 0, 0];
      point[fixed] = limit;
      point[variable] = Math.min(100, Math.max(0, value));
      if (!hits.some(hit => length(sub(hit, point)) < epsilon)) hits.push(point);
    }
  }
  return hits;
}

export function cast(point, method, amount) {
  const [x, y, z] = point;
  if (method === 'central') {
    const source = [30, 48, amount];
    const target = lerp(source, point, amount / (amount - z));
    target[2] = 0;
    return { origin: source, target };
  }
  const offset = method === 'oblique' ? Math.tan(amount * Math.PI / 180) / Math.SQRT2 : 0;
  return {
    origin: [x - 30 * offset, y - 30 * offset, z + 30],
    target: [x + z * offset, y + z * offset, 0],
  };
}

function intersects(a, b, c, d) {
  const wedge = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const on = (p, q, r) => p.every((value, i) => value >= Math.min(q[i], r[i]) - epsilon && value <= Math.max(q[i], r[i]) + epsilon);
  const ab = [wedge(a, b, c), wedge(a, b, d)];
  const cd = [wedge(c, d, a), wedge(c, d, b)];
  if (ab[0] * ab[1] < 0 && cd[0] * cd[1] < 0) return true;
  return (Math.abs(ab[0]) < epsilon && on(c, a, b)) || (Math.abs(ab[1]) < epsilon && on(d, a, b))
    || (Math.abs(cd[0]) < epsilon && on(a, c, d)) || (Math.abs(cd[1]) < epsilon && on(b, c, d));
}

export function validate(kind, vertices) {
  const sizes = { point: [1, 1], line: [2, 2], triangle: [3, 3], polygon: [3, 8] };
  const limits = Object.hasOwn(sizes, kind) ? sizes[kind] : null;
  if (!limits || !Array.isArray(vertices) || vertices.length < limits[0] || vertices.length > limits[1]) return '顶点数量不符合图形要求。';
  if (vertices.some(p => !Array.isArray(p) || p.length !== 3 || p.some(coordinate => !Number.isFinite(coordinate)))) return '请填写每个顶点的三个坐标。';
  if (vertices.some(p => p.some(coordinate => coordinate < 0 || coordinate > 100))) return '坐标应在 0 至 100 之间。';
  if (kind === 'point') return '';
  if (kind === 'line') return length(sub(vertices[0], vertices[1])) < epsilon ? '线段的两个端点不能重合。' : '';
  const normal = faceNormal(vertices);
  if (!normal) return '平面图形需要至少三个不共线的顶点。';
  if (vertices.some(p => Math.abs(dot(normal, sub(p, vertices[0]))) > epsilon)) return '这些顶点不共面。请同时调整三个坐标，或让所有顶点的一个坐标相同。';
  const unique = vertices.every((a, i) => vertices.slice(i + 1).every(b => length(sub(a, b)) >= epsilon));
  if (!unique) return '平面图形的顶点不能重合。';
  const axis = normal.reduce((best, value, i) => Math.abs(value) > Math.abs(normal[best]) ? i : best, 0);
  const points = vertices.map(point => point.filter((_, i) => i !== axis));
  const count = points.length;
  for (let i = 0; i < count; i++) {
    const previous = vertices[(i + count - 1) % count];
    const current = vertices[i];
    const next = vertices[(i + 1) % count];
    const incoming = sub(current, previous);
    const outgoing = sub(next, current);
    if (length(cross(incoming, outgoing)) < epsilon && dot(incoming, outgoing) < 0) return '相邻边不能折回重叠。';
    for (let j = i + 2; j < count; j++) {
      if (i === 0 && j === count - 1) continue;
      if (intersects(points[i], points[(i + 1) % count], points[j], points[(j + 1) % count])) return '边界发生自相交，请按绕边的顺序填写顶点。';
    }
  }
  return '';
}
