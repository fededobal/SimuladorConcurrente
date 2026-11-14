# Ejemplo que usa casi todo

```c
monitor Asignador {
  int libres = 3;
  bool tomado[3] = ([3] false);
  int otorgados = 0;
  cond hayLibre;

  procedure pedir(id: out int) {
    while (libres == 0) wait(hayLibre);
    libres = libres - 1;
    for (int i = 0..2) {
      if (not tomado[i] and id == 0) {
        tomado[i] = true;
        id = i + 1;
      }
    }
    otorgados++;
  }

  procedure devolver(id: in int) {
    tomado[id - 1] = false;
    libres = libres + 1;
    signal(hayLibre);
  }
}

process Cliente[c: 1..5] {
  int mio = 0;
  Asignador.pedir(mio);   // 'mio' vuelve escrito por el parámetro out
  Asignador.devolver(mio);
}
```

Aparecen un monitor con variables permanentes escalares y un arreglo, una variable
condición, un `while` que re-evalúa la condición después del `wait`, un `for` de rango, un
parámetro `out` y una familia de procesos.
