#!/usr/bin/env node
// Marca rasgos de redacción inflada o típica de texto generado por IA en documentos formales.
// Uso: node scripts/revisar-estilo.mjs docs/pps/informe.md [otros.md ...]
// No corrige: señala línea y motivo. Algunas marcas pueden ser legítimas; se justifican.
import { readFileSync } from 'node:fs';

const REGLAS = [
  [/\b(crucial|fundamental(es)?|robust[oa]s?|integral(es)?|hol[ií]stic[oa]s?|sinergia|innovador(a|es)?|vanguardia|sin precedentes)\b/gi, 'adjetivo inflado: reemplazar por un dato o eliminar'],
  [/\b(potenciar|aprovechar al m[aá]ximo|de manera eficiente|de forma eficiente)\b/gi, 'fórmula vacía'],
  [/\b(cabe destacar|es importante (destacar|mencionar|señalar)|vale la pena (señalar|mencionar)|sin lugar a dudas|en la era digital|en el mundo actual)\b/gi, 'muletilla'],
  [/^(En resumen|En conclusión|En este sentido|En definitiva),/gim, 'conector de cierre/relleno al inicio de párrafo'],
  [/no solo .{1,80}? sino (también|que)/gi, '"no solo… sino también": usar con moderación'],
  [/—/g, 'raya: preferir comas, paréntesis o dos oraciones'],
  [/[¡!]/g, 'exclamación en texto formal'],
  [/¿[^?]*\?/g, 'pregunta retórica'],
  [/\p{Extended_Pictographic}/gu, 'emoji'],
  [/\b(setear|deployar|testear|lockear|linkear)\b/gi, 'anglicismo evitable'],
];

let total = 0;
for (const archivo of process.argv.slice(2)) {
  const lineas = readFileSync(archivo, 'utf8').split('\n');
  let enCodigo = false;
  let vinetas = 0;
  let negritas = 0;
  lineas.forEach((linea, i) => {
    if (linea.trim().startsWith('```')) { enCodigo = !enCodigo; return; }
    if (enCodigo) return;
    if (/^\s*[-*]\s/.test(linea)) vinetas++;
    negritas += (linea.match(/\*\*[^*]+\*\*/g) || []).length;
    for (const [re, motivo] of REGLAS) {
      re.lastIndex = 0;
      const m = linea.match(re);
      if (m) {
        total += m.length;
        console.log(`${archivo}:${i + 1}: ${motivo} → "${m[0]}"`);
      }
    }
  });
  const prosa = lineas.filter((l) => l.trim() && !l.startsWith('#')).length || 1;
  if (vinetas / prosa > 0.35) {
    total++;
    console.log(`${archivo}: ${Math.round((100 * vinetas) / prosa)}% de las líneas son viñetas: desarrollar en prosa`);
  }
  if (negritas > 10) {
    total++;
    console.log(`${archivo}: ${negritas} negritas: reservarlas para términos definidos`);
  }
}
console.log(total ? `\n${total} marca(s) para revisar.` : 'Sin marcas.');
process.exit(total ? 1 : 0);
