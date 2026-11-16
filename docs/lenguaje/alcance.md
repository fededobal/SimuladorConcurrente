# Alcance de los nombres

| Lugar | Nombres visibles |
|---|---|
| Cuerpo de un `process` | Sus locales y el iterador de la familia |
| Cuerpo de un `procedure` | Sus parámetros, sus locales, las permanentes y `cond` del monitor |
| Inicialización del monitor | Las permanentes del monitor |

Las variables locales de un proceso no se ven dentro de un monitor. Si un procedure
necesita un dato del proceso, lo recibe por parámetro; si tiene que devolver un resultado,
lo entrega por un parámetro `out`.

No se puede asignar un valor a un parámetro `in`, al iterador de una familia ni al iterador
de un `for` dentro de su cuerpo.

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
