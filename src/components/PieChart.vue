<script setup>
import { computed } from 'vue'

// Gráfico de pizza simples em SVG, sem dependência externa.
const props = defineProps({
  data: { type: Array, required: true }, // [{ label, value }]
})
const PALETTE = ['#FF6B00', '#4E9CF5', '#35B8B0', '#B07CF7', '#F26DA7', '#E3B341', '#8896A6']
const total = computed(() => props.data.reduce((a, d) => a + d.value, 0))

const fatias = computed(() => {
  const t = total.value || 1
  let acc = 0
  return props.data.map((d, i) => {
    const frac = d.value / t
    const start = acc
    acc += frac
    return { ...d, cor: PALETTE[i % PALETTE.length], pct: frac, path: arc(start, acc) }
  })
})

function arc(startFrac, endFrac) {
  const R = 52, C = 60
  const a0 = startFrac * 2 * Math.PI - Math.PI / 2
  const a1 = endFrac * 2 * Math.PI - Math.PI / 2
  const x0 = C + R * Math.cos(a0), y0 = C + R * Math.sin(a0)
  const x1 = C + R * Math.cos(a1), y1 = C + R * Math.sin(a1)
  const large = endFrac - startFrac > 0.5 ? 1 : 0
  if (endFrac - startFrac >= 0.999) return `M ${C} ${C - R} A ${R} ${R} 0 1 1 ${C - 0.01} ${C - R} Z`
  return `M ${C} ${C} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`
}
const pct = (v) => (v * 100).toFixed(0) + '%'
</script>

<template>
  <div class="pie">
    <svg viewBox="0 0 120 120" width="120" height="120">
      <path v-for="f in fatias" :key="f.label" :d="f.path" :fill="f.cor" stroke="var(--surface)" stroke-width="1.5" />
      <circle cx="60" cy="60" r="26" fill="var(--surface)" />
      <text x="60" y="58" text-anchor="middle" class="c-num">{{ total }}</text>
      <text x="60" y="70" text-anchor="middle" class="c-lab">respostas</text>
    </svg>
    <ul class="leg">
      <li v-for="f in fatias" :key="f.label">
        <i :style="{ background: f.cor }" />
        <span class="l">{{ f.label }}</span>
        <span class="v">{{ f.value }} · {{ pct(f.pct) }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.pie { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.c-num { font-size: 16px; font-weight: 800; fill: var(--ink); }
.c-lab { font-size: 7px; fill: var(--ink-3); text-transform: uppercase; letter-spacing: .1em; }
.leg { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; min-width: 150px; }
.leg li { display: flex; align-items: center; gap: 8px; font-size: 12.5px; }
.leg i { width: 10px; height: 10px; border-radius: 3px; flex: none; }
.leg .l { flex: 1; color: var(--ink-2); }
.leg .v { font-weight: 700; font-variant-numeric: tabular-nums; }
</style>
