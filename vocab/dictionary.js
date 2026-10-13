'use strict';

// Bundled Spanish -> English vocabulary for offline mode.
// Format: spanish[ / spanish variant] | english[; alternate english ...]
// The first English entry is the preferred answer.
const RAW = `
el salón de clase | classroom
la clase | class; classroom
el aula | classroom
la escuela | school
el colegio | school
la pluma | pen
el bolígrafo | pen; ballpoint pen
el lápiz | pencil
el sacapuntas | pencil sharpener
la goma de borrar / el borrador | eraser
la regla | ruler
la calculadora | calculator
la cinta pegante / la cinta adhesiva | tape
el pegamento / la goma | glue
las tijeras | scissors
el papel | paper
la hoja de papel | sheet of paper
el cuaderno | notebook
el libro | book
el libro de texto | textbook
la mochila | backpack
el estuche | pencil case
la carpeta | folder
el diccionario | dictionary
el marcador | marker
el resaltador | highlighter
la tiza | chalk
la pizarra | chalkboard; whiteboard
el pizarrón | chalkboard; whiteboard
el borrador de pizarra | board eraser
el escritorio | desk
el pupitre | student desk; desk
la mesa | table
la silla | chair
el banco | bench
el estante | shelf
la estantería | bookshelf
el armario | cabinet; closet
el casillero | locker
la computadora | computer
el ordenador | computer
el teclado | keyboard
el ratón | mouse
la pantalla | screen
la impresora | printer
el proyector | projector
el reloj | clock; watch
el mapa | map
el globo terráqueo | globe
la bandera | flag
la puerta | door
la ventana | window
el piso / el suelo | floor
el techo | ceiling
la pared | wall
la luz | light
la lámpara | lamp
el cesto de basura / la papelera | wastebasket; trash can
la basura | trash
el pasillo | hallway
la biblioteca | library
el gimnasio | gym
la cafetería | cafeteria
el patio | playground; courtyard
la oficina | office
el baño | bathroom
el alumno / la alumna | pupil; student
el estudiante / la estudiante | student
el maestro / la maestra | teacher
el profesor / la profesora | teacher; professor
el director / la directora | principal; director
el compañero / la compañera | classmate; companion
el compañero de clase | classmate
el amigo / la amiga | friend
la tarea | homework; task
los deberes | homework
el examen | exam; test
la prueba | test; quiz
la nota | grade; note
la lección | lesson
la pregunta | question
la respuesta | answer
el ejemplo | example
el ejercicio | exercise
la página | page
la palabra | word
la oración | sentence
la frase | phrase; sentence
la letra | letter
el número | number
el horario | schedule
el recreo | recess; break
el almuerzo | lunch
el desayuno | breakfast
la cena | dinner
la comida | food; meal
las matemáticas | math; mathematics
la ciencia / las ciencias | science
la historia | history; story
el inglés | English
el español | Spanish
la geografía | geography
el arte | art
la música | music
la educación física | physical education; P.E.
la informática | computer science
uno | one
dos | two
tres | three
cuatro | four
cinco | five
seis | six
siete | seven
ocho | eight
nueve | nine
diez | ten
once | eleven
doce | twelve
trece | thirteen
catorce | fourteen
quince | fifteen
veinte | twenty
treinta | thirty
cien | one hundred; hundred
mil | thousand
rojo | red
azul | blue
verde | green
amarillo | yellow
anaranjado / naranja | orange
morado / violeta | purple
rosado / rosa | pink
negro | black
blanco | white
gris | gray; grey
marrón / café | brown
el lunes | Monday
el martes | Tuesday
el miércoles | Wednesday
el jueves | Thursday
el viernes | Friday
el sábado | Saturday
el domingo | Sunday
enero | January
febrero | February
marzo | March
abril | April
mayo | May
junio | June
julio | July
agosto | August
septiembre | September
octubre | October
noviembre | November
diciembre | December
la semana | week
el mes | month
el año | year
el día | day
la hora | hour
el minuto | minute
hoy | today
mañana | tomorrow; morning
ayer | yesterday
la noche | night
la tarde | afternoon; evening
la mañana | morning
la familia | family
la madre / la mamá | mother; mom
el padre / el papá | father; dad
el hermano / la hermana | brother; sister
el hijo / la hija | son; daughter
el abuelo / la abuela | grandfather; grandmother
el tío / la tía | uncle; aunt
el primo / la prima | cousin
el niño / la niña | child; boy; girl
el chico / la chica | boy; girl
el hombre | man
la mujer | woman
la casa | house; home
la cocina | kitchen
la sala | living room
el comedor | dining room
el dormitorio / la habitación | bedroom; room
el jardín | garden
la calle | street
la ciudad | city
el pueblo | town
el parque | park
la tienda | store; shop
el supermercado | supermarket
el restaurante | restaurant
el hospital | hospital
el banco de dinero | bank
el correo | post office; mail
la iglesia | church
el cine | movie theater; cinema
el museo | museum
la playa | beach
la montaña | mountain
el río | river
el mar | sea
el perro | dog
el gato | cat
el pájaro | bird
el pez | fish
el caballo | horse
la vaca | cow
el cerdo | pig
el conejo | rabbit
el ratón de campo | mouse
la manzana | apple
la naranja fruta | orange
el plátano / la banana | banana
la uva | grape
la fresa | strawberry
el limón | lemon
el pan | bread
la leche | milk
el agua | water
el jugo | juice
el queso | cheese
el huevo | egg
la carne | meat
el pollo | chicken
el pescado | fish
el arroz | rice
la sopa | soup
la ensalada | salad
la verdura / el vegetal | vegetable
la fruta | fruit
el helado | ice cream
la cabeza | head
el ojo | eye
la nariz | nose
la boca | mouth
la oreja | ear
el brazo | arm
la mano | hand
el dedo | finger
la pierna | leg
el pie | foot
el corazón | heart
la camisa | shirt
los pantalones | pants
el vestido | dress
la falda | skirt
el zapato | shoe
los zapatos | shoes
el calcetín | sock
el sombrero | hat
la chaqueta | jacket
el abrigo | coat
hace calor | it is hot
hace frío | it is cold
hace sol | it is sunny
llueve | it rains; it is raining
nieva | it snows; it is snowing
el tiempo | weather; time
la lluvia | rain
la nieve | snow
el viento | wind
el coche / el carro | car
el autobús | bus
el tren | train
el avión | airplane
la bicicleta | bicycle
hablar | to speak; to talk
comer | to eat
beber | to drink
vivir | to live
escribir | to write
leer | to read
escuchar | to listen
mirar | to look; to watch
ver | to see
correr | to run
caminar | to walk
saltar | to jump
trabajar | to work
estudiar | to study
aprender | to learn
enseñar | to teach
abrir | to open
cerrar | to close
ir | to go
venir | to come
tener | to have
ser | to be
estar | to be
hacer | to do; to make
decir | to say; to tell
dar | to give
querer | to want; to love
poder | can; to be able to
saber | to know
conocer | to know; to meet
pensar | to think
comprar | to buy
vender | to sell
jugar | to play
cantar | to sing
bailar | to dance
dibujar | to draw
pintar | to paint
nadar | to swim
dormir | to sleep
despertarse | to wake up
levantarse | to get up
sentarse | to sit down
ayudar | to help
necesitar | to need
usar | to use
llamar | to call
preguntar | to ask
contestar / responder | to answer
borrar | to erase
sacar punta | to sharpen
pegar | to glue; to stick
cortar | to cut
repetir | to repeat
entender | to understand
olvidar | to forget
recordar | to remember
hola | hello
adiós | goodbye
buenos días | good morning
buenas tardes | good afternoon
buenas noches | good evening; good night
hasta luego | see you later
hasta mañana | see you tomorrow
por favor | please
gracias | thank you; thanks
de nada | you're welcome
lo siento | I'm sorry
perdón | excuse me; sorry
con permiso | excuse me
cómo estás | how are you
cómo te llamas | what is your name
me llamo | my name is
mucho gusto | nice to meet you
encantado / encantada | pleased to meet you
sí | yes
no | no
bien | well; good
mal | bad; badly
muy | very
más | more
menos | less
grande | big; large
pequeño | small
bueno | good
malo | bad
nuevo | new
viejo | old
alto | tall
bajo | short; low
largo | long
corto | short
bonito / hermoso | pretty; beautiful
feo | ugly
feliz | happy
triste | sad
cansado | tired
enfermo | sick
rápido | fast
lento | slow
fácil | easy
difícil | difficult; hard
aquí | here
allí / allá | there
cerca | near
lejos | far
encima de / sobre | on top of; on
debajo de | under
al lado de | next to
detrás de | behind
delante de | in front of
entre | between
dentro de | inside
fuera de | outside
cuándo | when
dónde | where
qué | what
quién | who
por qué | why
cómo | how
cuánto | how much
`;

const ARTICLES = /^(el|la|los|las|un|una|unos|unas)\s+/;

function normalize(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// key: normalized Spanish with article removed -> { spanish, english[] }
const entries = new Map();

for (const line of RAW.split('\n')) {
  if (!line.trim()) continue;
  const [es, en] = line.split('|').map(s => s.trim());
  const english = en.split(';').map(s => s.trim()).filter(Boolean);
  for (const variant of es.split('/')) {
    const key = normalize(variant).replace(ARTICLES, '');
    if (key && !entries.has(key)) entries.set(key, { spanish: variant.trim(), english });
  }
}

// Look up a Spanish word/phrase; articles and accents are ignored.
function lookup(text) {
  const raw = String(text || '');
  const keys = [raw, ...raw.split('/')].map(t => normalize(t).replace(ARTICLES, ''));
  for (const k of keys) {
    if (entries.has(k)) return entries.get(k);
  }
  return null;
}

// Find every dictionary phrase contained in free text (longest phrases first).
function findInText(text) {
  const padded = ` ${normalize(text)} `;
  const hits = [];
  const keys = [...entries.keys()].sort((a, b) => b.length - a.length);
  let remaining = padded;
  for (const k of keys) {
    const needle = ` ${k} `;
    if (k.length >= 3 && remaining.includes(needle)) {
      hits.push(entries.get(k));
      remaining = remaining.split(needle).join(' ');
    }
  }
  return hits;
}

module.exports = { lookup, findInText, normalize, size: () => entries.size };
