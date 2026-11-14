# Alcance de los nombres

| Dónde estás | Qué ves |
|---|---|
| Cuerpo de un `process` | sus locales y el iterador de la familia |
| Cuerpo de un `procedure` | sus parámetros, sus locales, las permanentes y `cond` del monitor |
| Inicialización del monitor | las permanentes del monitor |

Lo importante: **las variables locales de un proceso no se ven adentro de un monitor**. Si
un procedure necesita un dato del proceso, entra por parámetro; si tiene que devolver algo,
sale por un `out`.

No se puede asignar a: un parámetro `in`, el iterador de una familia ni el iterador de un
`for` dentro de su cuerpo.

Ningún nombre puede tapar a otro que ya se ve: una local no puede llamarse como una
permanente, un parámetro, un iterador, una `cond` u otra local visible. Dos bloques
hermanos sí pueden usar el mismo nombre, porque uno no ve al otro:

```c
process P[i: 0..1] {
  for (int i = 0..5) { skip; }   // error: ya existe el iterador de la familia 'i'
  { int x = 1; }
  { text x = "a"; }              // válido: el primer x ya no se ve
}
```
