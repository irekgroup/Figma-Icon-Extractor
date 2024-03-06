// **1. Импорт библиотек:**
require('dotenv').config();
const superagent = require('superagent');
const path = require('node:path');
const fs = require('fs/promises');
const chalk = require('chalk');
require('dotenv').config({path: '.env.local'} );

// **2. Конфигурация:**
const {FIGMA_TOKEN} = process.env;
const FIGMA_API_HOST = 'https://api.figma.com/v1';
const ICONS_FILE_KEY = '1TDMKALpzX0ByUE7Jo2Fw8';
const CONTAINER_NODE_TYPE = 'FRAME';
const ICON_NODE_TYPE = 'COMPONENT';

/* // **3. Типы иконок:**
const Types = {
  Icons: 'icons',
  Unknown: 'unknown',
};

const PREFIXES = {
  [Types.Icons]: 'Positive Icons -',
  [Types.Icons]: 'Negative Icons -',
};

const BASE_DIR = '/static';
const IMG_DIR = `${BASE_DIR}/`;
const DIRECTORIES_BY_TYPES = {
  [Types.Icons]: 'positive/',
  [Types.Icons]: 'negative/',
}; */

const PAGE_NAME = 'Icons';

const Types = {
  Positive: 'positive',
  Negative: 'negative',
  Unknown: 'unknown',
};

const PREFIXES = {
  [Types.Positive]: 'Positive Icons - Master Components',
  [Types.Negative]: 'Negative Icons - Nested Instances',
  [Types.Stub]: 'stub-',
};

const BASE_DIR = '/static';
const IMG_DIR = `${BASE_DIR}/`;
const DIRECTORIES_BY_TYPES = {
  [Types.Positive]: 'positive/',
  [Types.Negative]: 'negative/',
};

// **4. Функции:**

// **4.1. Получение типа иконки по префиксу:**
const getTypeByPrefix = (name) => {
  // **1. Перебор префиксов:**
  return Object.entries(PREFIXES).reduce((acc, [type, prefix]) => {
    // **2. Проверка совпадения префикса с именем:**
    if (name.startsWith(prefix)) {
      // **2.1. Если совпадение найдено:**
      // Возвращаем тип иконки
      return type;
    }
    // **2.2. Если совпадения нет:**
    // Возвращаем накопленный тип (по умолчанию - "Unknown")
    return acc;
  }, Types.Unknown);
};

const IGNORED_TYPES = [Types.Stub, Types.Unknown];

const agent = superagent.agent();

const transformFigmaNode = (
  // **1. Параметры:**
  {name, id}, // Имя и ID узла Figma
  parentType = Types.Icons, // Тип родительского контейнера (по умолчанию - "Unknown")

  ) => {
  // **2. Определение типа иконки:**
  const iconExplicitType = getTypeByPrefix(name); // Определение типа по префиксу имени

  // **3. Формирование объекта иконки:**
  return {
    // **3.1. Имя:**
    name: name.replaceAll(/ |\//g, ''),
    // **3.2. ID:**
    id,
    // **3.3. Тип:**
    type:
    // **3.3.1. Если тип иконки явно указан в имени:**
      iconExplicitType !== Types.Unknown
        ? iconExplicitType
        //**3.3.2. Если тип не указан, используем тип родительского контейнера:**
        : parentType,
  };
};

// **4.3. Генерация TypeScript-типа union:**
const generateUnionString = (names) =>
  names.length ? ["'", names.join("' | '"), "'"].join('') : 'never';

  // **4.4. Логирование:**
const logger = {
  info: (text) =>
    console.log(
      `${chalk.black.bgWhite(' INFO: '.padEnd(10))} ${text}`,
    ),
  success: (text) =>
    console.log(
      `${chalk.black.bgGreen(' SUCCESS: '.padEnd(10))} ${text}`,
    ),
  error: (text) =>
    console.log(
      `${chalk.black.bgRed(' ERROR: '.padEnd(10))} ${text}`,
    ),
};

// **5. Основная функция:**
async function main() {
  if (!FIGMA_TOKEN) {
    logger.error(
      'No figma token found! Make sure FIGMA_TOKEN is in your .env file or is in your environment variables',
    );

    process.exit(1);
  }

  // **5.2. Получение информации о документе Figma:**
  let figmaDocument;

  logger.info('Getting info about icons document frames...');
  try {
    figmaDocument = (
      await agent
        .get(`${FIGMA_API_HOST}/files/${ICONS_FILE_KEY}`)
        .set('X-FIGMA-TOKEN', FIGMA_TOKEN)
    ).body;
  } catch (error) {
    logger.error(
      'Could not fetch figma document tree. Figma API error message:',
    );
    console.log(error);
    process.exit(1);
  }

  /* // **1.3. Получение списка названий папок:**
  const folderNames = [];
  // **1.4. Поиск страницы по имени и извлечение иконок:**
  const icons = figmaDocument.find(({name}) => name === PAGE_NAME)
  .children
	.reduce((acc, item) => {
		const { name: folderName, children } = item; // Извлечь название папки и дочерние элементы
		folderNames.push(folderName);// Добавить название папки в список

		return [
      ...acc, // Добавить к результату накопленные элементы
      ...children.map(({id, name}) =>
      ({id, name, folderName}))]; // Преобразовать дочерние элементы
	}, []);

  console.log(icons); */

  logger.info('Traversing figma tree to get icon components...');

  // **5.3. Извлечение иконок из документа Figma:**
  // **5.3.1. Получаем дочерние элементы каждой страницы документа Figma:**
/*   const iconsPage = figmaDocument?.document?.children?.find(
    ({ name }) => name === PAGE_NAME
  ); // Получаем массив страниц
.map(({ children }) => children) // Извлекаем дочерние элементы каждой страницы
.reduce((acc, pageNodes) => [...acc, ...pageNodes], []) // Объединяем дочерние элементы всех страниц

// **5.3.2. Ищем иконки в узлах документа Figma:**
.reduce((acc, node) => {

// **5.3.2.1. Обработка узлов контейнера:**
if (
  node.type === CONTAINER_NODE_TYPE && // Проверяем тип узла (контейнер)
  node?.children?.length // Проверяем наличие дочерних элементов
) {
  const containerType = getTypeByPrefix(node.name); // Определяем тип иконки по префиксу контейнера

  // **5.3.2.1.1. Обработка дочерних элементов контейнера:**
  return [
    ...acc, // Добавляем к результату накопленные иконки
    ...node.children // Перебираем дочерние элементы контейнера
      .map((childNode) =>
        childNode.type === ICON_NODE_TYPE // Проверяем тип дочернего элемента (иконка)
          ? transformFigmaNode(childNode, containerType) // Преобразуем узел иконки, учитывая тип контейнера
          : null, // Если не иконка, пропускаем
      )
      .filter(Boolean), // Убираем элементы с undefined (пропущенные)
  ];

}
// **5.3.2.2. Обработка отдельных узлов иконок:**

else if (node.type === ICON_NODE_TYPE) { // Если узел является отдельной иконкой
  return [...acc, transformFigmaNode(node)]; // Преобразуем узел иконки
}

// **5.3.2.3. Пропуск ненужных узлов:**

return acc; // Возвращаем накопленные иконки, если узел не подходит
}, [])

// **5.3.3. Фильтрация иконок по типу:**

.filter(({ type }) => !IGNORED_TYPES.includes(type)); // Оставляем только иконки нужных типов (не "stub" и "unknown")
console.log(iconNodes); */

const iconsPage = figmaDocument?.document?.children?.find(
  ({ name }) => name === PAGE_NAME
);

// **5.3.2. Получение дочерних элементов страницы "Icons":**

const iconNodes = iconsPage?.children;

// **5.3.3. Ищем иконки в узлах страницы:**

const icons = iconNodes?.reduce((acc, node) => {

  // **5.3.3.1. Обработка узлов контейнера:**

  if (
    node.type === CONTAINER_NODE_TYPE &&
    node?.children?.length
  ) {
    const containerType = getTypeByPrefix(node.name);

    // **5.3.3.1.1. Обработка дочерних элементов контейнера:**

    return [
      ...acc,
      ...node.children
        .map((childNode) =>
          childNode.type === ICON_NODE_TYPE
            ? transformFigmaNode(childNode, containerType)
            : null
        )
        .filter(Boolean),
    ];
  }

  // **5.3.3.2. Обработка отдельных узлов иконок:**

  else if (node.type === ICON_NODE_TYPE) {
    return [...acc, transformFigmaNode(node)];
  }

  // **5.3.3.3. Пропуск ненужных узлов:**

  return acc;
}, []);

// **5.3.4. Фильтрация иконок по типу:**

const filteredIcons = icons.filter(({ type }) => !IGNORED_TYPES.includes(type));

// **5.3.5. Вывод списка папок:**

const folderNames = icons
  .map(({ folderName }) => folderName)
  .filter((folderName, index, arr) => arr.indexOf(folderName) === index);

console.log(icons);

  let downloadableIcons;

  logger.info('Getting links to exported SVGs...');
  try {
    const iconUrls = (
      await agent
        .get(`${FIGMA_API_HOST}/images/${ICONS_FILE_KEY}`)
        .query({
          ids: iconNodes.map(({id}) => id).join(','),
          format: 'svg',
        })
        .set('X-FIGMA-TOKEN', FIGMA_TOKEN)
    ).body.images;

    downloadableIcons = iconNodes.map((icon) => ({
      ...icon,
      url: iconUrls[icon.id],
    }));
  } catch (error) {
    logger.error(
      'Failed to fetch URLs to exported icon nodes. Figma API error message:',
    );
    console.log(error);
    process.exit(1);
  }



  logger.info('Recreating folder structure...');
  const folderPath = path.join(process.cwd(), IMG_DIR);
  await fs.rm(folderPath, {force: true, recursive: true});
  await fs.mkdir(folderPath, {recursive: true});

  await Promise.all(
    Object.values(DIRECTORIES_BY_TYPES).map(async (dirName) =>
      fs.mkdir(path.join(folderPath, dirName), {recursive: true}),
    ),
  );

  logger.info(`Downloading ${downloadableIcons.length} icons...`);

  const pLimit = (await import('p-limit')).default;

  const limit = pLimit(10);

// **1. Загрузка и сохранение иконок:**
  await Promise.all(
    downloadableIcons.map(({name, url, type}) =>
      limit(async (cb) => {
        try {
          //**1.1. Загрузка иконки:**
          /// Загрузка иконки без заголовка с токеном Figma, т.к. URL ведут в S3
          const icon = (await agent.get(url).retry(3)).body;
          // **1.2. Преобразование иконки:**
          let transformedIcon;
          let extension = '.svg';

        // **1.3. Сохранение иконки:**
          await fs.writeFile(
            path.join(
              folderPath, // Путь к папке с иконками
              DIRECTORIES_BY_TYPES[type],// Подпапка, соответствующая типу иконки
              `${name}${extension}`,// Имя файла с расширением
            ),
            transformedIcon || icon,
          );
          // **1.4. Вызов обратного вызова:**
          cb?.();
        } catch (e) {
          logger.error(
            `Failed to fetch icon ${name} of type ${type}. Original error message/object:`,
          );
          console.log(e?.message || e);
          if (cb) {
            cb?.(e);
          } else {
            throw e;
          }
        }
      }),
    ),
    10,
  );

  logger.info('Exporting typings...');
  // **1. Группировка названий иконок по типу:**
  const names = downloadableIcons.reduce(
    (acc, {name, type}) => {
      return {...acc, //**1.1. Добавление имени иконки к массиву соответствующего типа:**
        [type]: [...acc[type], name]};// Создание массива имен для каждого типа
    },
    {
      // **1.2. Объект для начальной инициализации:**
      [Types.Positive]: [], // Массив для положительных иконок
      [Types.Negative]: [], // Массив для отрицательных иконок
    },
  );

  // **2. Генерация строк для типов иконок:**
  // **2.1. Объявление типа для положительных иконок:**
  const typedef = `export type PositiveIconNames = ${generateUnionString(
    names[Types.Positive],
   )};\nexport type NegativeIconNames = ${generateUnionString(
    names[Types.Negative],
   )};\n`;

  // **3. Сохранение типов иконок в файл:**
  await fs.writeFile(
    path.join(process.cwd(), `${BASE_DIR}/iconNames.ts`),
    typedef,
  );

  logger.info('Exporting catalog for storybook...');
  // **4. Сохранение каталога иконок в файл:**
  await fs.writeFile(
    path.join(process.cwd(), `${BASE_DIR}/catalog.json`),
    JSON.stringify(names),
  );


  logger.success(
    'Done! Now use <Icon /> component to insert icons into your layout or run storybook to find the icon needed!',
  );
}

main();