// **1. Импорт библиотек:**
require('dotenv').config();
const superagent = require('superagent');
const path = require('node:path');
const fs = require('fs/promises');
const logger = require('./logger.js')
require('dotenv').config({path: '.env.local'} );

// **2. Конфигурация:**
const {FIGMA_TOKEN} = process.env;
const FIGMA_API_HOST = 'https://api.figma.com/v1';
const ICONS_FILE_KEY = '1TDMKALpzX0ByUE7Jo2Fw8';
const CONTAINER_NODE_TYPE = 'FRAME';
const ICON_NODE_TYPE = 'COMPONENT';
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

// **5. Основная функция:**
async function main() {
  if (!FIGMA_TOKEN) {
    logger.error(
      'Токен Figma не найден! Убедитесь, что FIGMA_TOKEN находится в вашем файле .env или в переменных вашей среды',
    );

    process.exit(1);
  }

  // **5.2. Получение информации о документе Figma:**
  let figmaDocument;

  logger.info('Получение информации о фреймах документов с иконками...');
  try {
    figmaDocument = (
      await agent
        .get(`${FIGMA_API_HOST}/files/${ICONS_FILE_KEY}`)
        .set('X-FIGMA-TOKEN', FIGMA_TOKEN)
    ).body;
  } catch (error) {
    logger.error(
      'Не удалось получить дерево документов Figma. Сообщение об ошибке API Figma:',
    );
    console.log(error);
    process.exit(1);
  }

logger.info('Обход дерева фигма для получения компонентов иконок...');


const iconsPage = figmaDocument?.document?.children?.find(
  ({ name }) => name === PAGE_NAME
);

// **5.3.2. Получение дочерних элементов страницы "Icons":**
const iconNodes = iconsPage?.children

// **5.3.3. Ищем иконки в узлах страницы:**
const icons = iconNodes?.reduce((acc, node) => {

  // **5.3.3.1. Обработка узлов контейнера:**
  if (
    node.type === CONTAINER_NODE_TYPE && // Проверяем тип узла (контейнер)
    node?.children?.length // Проверяем наличие дочерних элементов
    ) {
      const containerType = getTypeByPrefix(node.name); // Определяем тип иконки по префиксу контейнера

      // **5.3.3.1.1. Обработка дочерних элементов контейнера:**
      return [
        ...acc, // Добавляем к результату накопленные иконки
        ...node.children // Перебираем дочерние элементы контейнера
        .map((childNode) =>
        childNode.type === ICON_NODE_TYPE // Проверяем тип дочернего элемента (иконка)
        ? transformFigmaNode(childNode, containerType) // Преобразуем узел иконки, учитывая тип контейнера
        : null // Если не иконка, пропускаем
        )
        .filter(Boolean),// Убираем элементы с undefined (пропущенные)
      ];
    }

    // **5.3.3.2. Обработка отдельных узлов иконок:**
    else if (node.type === ICON_NODE_TYPE) { // Если узел является отдельной иконкой
      return [...acc, transformFigmaNode(node)]; // Преобразуем узел иконки
    }

    // **5.3.3.3. Пропуск ненужных узлов:**
    return acc; // Возвращаем накопленные иконки, если узел не подходит
  }, [])

  // **5.3.4. Фильтрация иконок по типу:**
.filter(({ type }) => !IGNORED_TYPES.includes(type)); // Оставляем только иконки нужных типов (не "stub" и "unknown")


// **5.3.5. Вывод списка папок:**
  let downloadableIcons;

  logger.info('Получение ссылок на экспортированные SVG...');
  try {
    // 1. Получение URL-адресов иконок через запрос к API Figma
    const iconUrls = (
      await agent
      .get(`${FIGMA_API_HOST}/images/${ICONS_FILE_KEY}`)// URL для получения ссылок на иконки
      .query({ // Параметры запроса
        ids: icons // Массив узлов иконок
        .map(({id}) => id) // Извлечение идентификаторов узлов
        .join(','), // Объединение идентификаторов запятыми
        format: 'svg', // Формат иконок (SVG)
      })

      .set('X-FIGMA-TOKEN', FIGMA_TOKEN) // Установка токена авторизации
      ).body.images;// Извлечение ссылок на иконки из ответа


    // 2. Добавление URL-адресов к объектам иконок
    downloadableIcons = icons.map((icon) => ({
      ...icon,// Копирование всех свойств из исходного объекта
      url: iconUrls[icon.id],// Добавление свойства "url" с соответствующей ссылкой
    }));

  } catch (error) {
    // 3. Обработка ошибки
    logger.error(
      'Не удалось получить URL-адреса экспортированных узлов значков. Сообщение об ошибке API Figma:',
      ); // Вывод информации об ошибке
      console.log(error);
      process.exit(1);// Завершение процесса с кодом ошибки 1
    }

    logger.info('Воссоздание структуры папок...');
    const folderPath = path.join(process.cwd(), IMG_DIR);
    await fs.rm(folderPath, {force: true, recursive: true});
    await fs.mkdir(folderPath, {recursive: true});


    await Promise.all(
      Object.values(DIRECTORIES_BY_TYPES).map(async (dirName) =>
      fs.mkdir(path.join(folderPath, dirName), {recursive: true}),
      ),
      );

      logger.info(`Загрузка ${downloadableIcons.length} иконки...`);

      const pLimit = (await import('p-limit')).default;

      const limit = pLimit(100);

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
            `Не удалось получить иконку ${name} типа ${type}. Исходное сообщение об ошибке/объект:`,
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
    100,
  );

  logger.info('Экспорт ввода...');
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

  logger.info('Экспорт каталога для сборника иконок...');
  // **4. Сохранение каталога иконок в файл:**
  await fs.writeFile(
    path.join(process.cwd(), `${BASE_DIR}/catalog.json`),
    JSON.stringify(names),
  );

  logger.success(
    'Сделано! Теперь используйте <Icon /> компонент для вставки иконок в макет',
  );
}

main();