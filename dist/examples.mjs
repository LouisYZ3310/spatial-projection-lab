import { lerp } from './geometry.mjs';

export const types = { point: '点', line: '线段', triangle: '三角形', polygon: '平面多边形', solid: '长方体' };
export const make = (id, kind, vertices, labels, faces) => ({ id, kind, vertices, labels, faces });
const A = [60, 30, 40];
const triangle = [A, [25, 65, 35], [40, 45, 75]];
const abc = vertices => make('abc', 'triangle', vertices, ['A', 'B', 'C']);
const ab = (vertices, id = 'ab', labels = ['A', 'B']) => make(id, 'line', vertices, labels);
const point = (name, vertex) => make(name, 'point', [vertex], [name]);

const start = [24, 25, 24];
const lines = [
  ['line-general', '一般位置直线', [69, 67, 76], '三个投影都缩短。比较三个方向分别舍去的坐标差。'],
  ['line-v-parallel', '正平线 · 平行 V', [69, 25, 76], 'V 投影保留全部长度，另外两面上的投影平行于投影轴。'],
  ['line-h-parallel', '水平线 · 平行 H', [69, 67, 24], 'H 投影反映实长。V 和 W 的两个端点等高。'],
  ['line-w-parallel', '侧平线 · 平行 W', [24, 67, 76], 'W 投影反映实长，两个端点到 W 面的距离相同。'],
  ['line-v-normal', '正垂线 · 垂直 V', [24, 67, 24], '两个端点的 x、z 相同，正投影重合为一点。'],
  ['line-h-normal', '铅垂线 · 垂直 H', [24, 25, 76], '两个端点的 x、y 相同，水平投影重合为一点。'],
  ['line-w-normal', '侧垂线 · 垂直 W', [69, 25, 24], '两个端点的 y、z 相同，侧投影重合为一点。'],
];

const surfaces = [
  ['plane-general', '一般位置平面', triangle, '三个正投影都仍是三角形。由于平面倾斜，边长和角度一般会改变。'],
  ['plane-v-parallel', '正平面 · 平行 V', [A, [25, 30, 35], [40, 30, 75]], 'V 面反映实形，H、W 面上的投影各积聚为一条线。'],
  ['plane-h-parallel', '水平面 · 平行 H', [A, [25, 65, 40], [40, 45, 40]], 'H 面反映实形，V、W 面上的投影各积聚为一条线。'],
  ['plane-w-parallel', '侧平面 · 平行 W', [A, [60, 65, 35], [60, 45, 75]], 'W 面反映实形，V、H 面上的投影各积聚为一条线。'],
  ['plane-v-normal', '正垂面 · 垂直 V', [A, [25, 65, 35], [60, 78, 40]], 'V 面积聚成直线，H、W 面上的投影各有类似性。'],
  ['plane-h-normal', '铅垂面 · 垂直 H', [A, [25, 65, 35], [60, 30, 75]], 'H 面积聚成直线，V、W 面上的投影各有类似性。'],
  ['plane-w-normal', '侧垂面 · 垂直 W', [A, [25, 65, 35], [88, 30, 40]], 'W 面积聚成直线，V、H 面上的投影各有类似性。'],
];

const pairA = ab([[25, 32, 26], [75, 65, 74]]);
const pair = (z1, z2) => ab([[25, 65, z1], [75, 32, z2]], 'cd', ['C', 'D']);
const solidVertices = [[-24,-18,-15],[24,-18,-15],[24,18,-15],[-24,18,-15],[-24,-18,15],[24,-18,15],[24,18,15],[-24,18,15]]
  .map(([x, y, z]) => {
    const [c, s, p, q] = [Math.cos(.38), Math.sin(.38), Math.cos(.28), Math.sin(.28)];
    const [u, v, w] = [x * c - y * s, (x * s + y * c) * p - z * q, (x * s + y * c) * q + z * p];
    const [r, t] = [Math.cos(.17), Math.sin(.17)];
    return [50 + u * r + w * t, 49 + v, 51 - u * t + w * r];
  });
const solid = make('box', 'solid', solidVertices, [], [[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]);
const example = (id, name, shapes, description, pages) => ({ id, name, shapes, description, pages });

export const examples = {
  unfold: [example('unfold', '展开三投影面', [abc(triangle)], '拖动滑杆展开 H、W 两面。选中顶点，沿投射线找到它的三个投影。', '第 2 章 · 第 7–10 页')],
  points: [
    example('point-third', '已知两面求第三面', [point('A', A)], '用 V 面确定高度 z，把 H 面上的深度 y 经 45° 线转到 W 面。两条辅助线的交点就是 a″。', '第 2 章 · 第 9–10 页'),
    example('point-relative', '两点的相对位置', [point('A', [65, 64, 73]), point('B', [30, 28, 39])], 'V 面读左右和上下，H 面读左右和前后，W 面读前后和上下。A 在 B 的左、前、上方。', '第 2 章 · 第 11 页'),
    example('point-overlap', '重影点与可见性', [point('A', A), point('B', [60, 65, 40])], 'A、B 的 x 和 z 相同，因此在 V 面重影。从正面观察时，y 较大的 B 在前，记为 b′(a′)。', '第 2 章 · 第 12 页'),
  ],
  lines: [
    ...lines.map(([id, name, b, text]) => example(id, name, [ab([start, b])], text, '第 2 章 · 第 15–20 页')),
    example('line-crossing', '两线相交', [pairA, pair(74, 26)], '三视图的交点都来自同一个空间点 K。选中 K，可核对它的三个投影。', '第 2 章 · 第 26 页'),
    example('line-skew', '两线交叉', [pairA, pair(62, 14)], 'H 面看似相交。两个交叉位置在空间的 x、y 相同，但 z 不同。用 V 面比较 K、L 的高度。', '第 2 章 · 第 27 页'),
  ],
  surfaces: [
    ...surfaces.map(([id, name, points, text]) => example(id, name, [abc(points)], text, '第 2 章 · 第 31–35 页')),
    example('plane-construct', '面上取线、取点', [abc(triangle)], '先在 AB、AC 上各取一点 M、N，再连成面内线段 MN。最后在 MN 上取点 K。', '第 2 章 · 第 36–37 页'),
  ],
  solid: [example('solid', '长方体 · 可见性', [solid], '分别从正面、上方和左侧观察。后侧棱在对应视图中用细虚线表示，转动空间图可检查它们的位置。', '第 1 章 · 第 19 页')],
  custom: [],
};

export const construction = (() => {
  const [a, b, c] = triangle;
  const m = lerp(a, b, .45);
  const n = lerp(a, c, .7);
  return [ab([m, n], 'mn', ['M', 'N']), point('K', lerp(m, n, .47))];
})();

export const relations = {
  'line-crossing': [point('K', lerp(...pairA.vertices, .5))],
  'line-skew': [point('K', lerp(...pairA.vertices, .5)), point('L', lerp(...pair(62, 14).vertices, .5))],
};

export const defaultVertices = {
  point: () => [[48, 52, 55]],
  line: () => [[23, 32, 25], [68, 58, 70]],
  triangle: () => triangle,
  polygon: count => Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / count;
    return [Math.round(50 + 28 * Math.cos(angle)), Math.round(50 + 28 * Math.sin(angle)), 45];
  }),
};

export const traceTriangle = [[65, 12, 15], [15, 60, 23], [16, 15, 65]];
