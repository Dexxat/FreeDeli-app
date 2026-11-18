# FreeDeli · instrucciones para Claude

- Al empezar una sesión, leé [ESTADO.md](ESTADO.md): dice en qué etapa está el proyecto y qué sigue. Si el usuario pregunta "¿en qué estamos?", respondé desde ahí.
- Al terminar un bloque de trabajo, actualizá ESTADO.md (etapa, casillas, tabla "Hecho" y fecha).
- Hablá en español rioplatense, simple: el dueño no es programador.
- Antes de desarrollar cada parte, consultá con el usuario. Commit y push solo cuando lo pida.
- Código simple y limpio, sin sobreingeniería. Las reglas de negocio van en `projects/shared/src/lib/rules` (las usan las apps y la API) y cada cambio lleva sus pruebas.
