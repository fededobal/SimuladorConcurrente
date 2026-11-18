# Llamadas entre monitores

Un procedure de un monitor A puede llamar a un procedure de otro monitor B. Como explica la
cátedra (Explicación práctica 3), **el monitor desde donde se hizo la llamada se mantiene
ocupado** hasta que el procedure de B termina por completo, aunque el proceso haga `wait`
en B. Es una llamada cerrada
([ADR 0007](/decisiones/0007-llamadas-cerradas-entre-monitores)). Mientras tanto, ningún
otro proceso puede entrar a A.

Hay que tener cuidado: si el proceso espera en B algo que solo puede hacer otro proceso que
necesita entrar a A, nadie avanza. En ese caso el simulador informa el deadlock y dice
qué monitor retiene cada proceso bloqueado, por ejemplo "P espera en B.c y retiene A".

Un procedure no puede llamar a otro procedure de su propio monitor: es error de
compilación.
