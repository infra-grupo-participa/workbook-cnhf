<script setup>
defineProps({ height: { type: Number, default: 40 } })
</script>
<template>
  <svg :height="height" viewBox="0 0 780 168" fill="none" xmlns="http://www.w3.org/2000/svg"
    role="img" aria-label="Curso Nacional de Formação em Holding Familiar">
    <text x="390" y="34" text-anchor="middle" font-family="'Arial Narrow','Helvetica Neue',Arial,sans-serif"
      font-size="28" font-weight="700" letter-spacing="2" fill="currentColor">CURSO NACIONAL DE FORMAÇÃO EM</text>
    <rect x="34" y="46" width="712" height="6" fill="#FF6B00" />
    <rect x="10" y="150" width="760" height="6" fill="#FF6B00" />
    <g font-family="'Arial Black','Helvetica Neue',Arial,sans-serif" font-weight="900" font-style="italic">
      <text x="20" y="134" font-size="58" letter-spacing="-1" fill="currentColor">HOLDING</text>
      <text x="408" y="134" font-size="58" letter-spacing="-1" fill="currentColor">FAMILIAR</text>
    </g>
    <g stroke="#FF6B00" stroke-width="7" fill="none">
      <line x1="360" y1="84" x2="342" y2="124" /><line x1="360" y1="84" x2="378" y2="124" />
      <circle cx="360" cy="76" r="13" /><circle cx="336" cy="132" r="13" /><circle cx="384" cy="132" r="13" />
    </g>
  </svg>
</template>
