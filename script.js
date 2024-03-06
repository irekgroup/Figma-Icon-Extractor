/* const logger = require('./logger.js')

let count = 0;
let isSuccess = true;

const myFunction = () => {
    count +=1;

    logger.info(`send... ${count}`)
     if (isSuccess) {
        setTimeout(myFunction, 1000)
     }


}

myFunction() */


//вывод красивого консольлога
/* const logger = require('./logger.js')

const args = '123'

logger.error(args) */

//ProgressBar
/* const ProgressBar = require('progress')
const bar = new ProgressBar(':bar', { total: 10 })
const timer = setInterval(() => {
  bar.tick()
  if (bar.complete) {
    clearInterval(timer)
  }
}, 100) */

//микрочатик
/* const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  })
  readline.question(`What's your name?`, (name) => {
    console.log(`Hi ${name}!`)
    readline.close()
  }) */

//подключение кнопки
/* document.getElementById('button').addEventListener('click', (event) => {
    console.log(event)
  }) */

//создание промиса

/* let done = false;

const promiseInstans = new Promise(
  (resolve, reject) => {
    if (done) {
      const workDone = 'Here is the thing I built'
      resolve(workDone)
    } else {
      const why = 'Still working on something else'
      reject(why)
    }
  }
);

const checkPromise = () => {
  promiseInstans
    .then((ok) => {
      console.log(ok)
    })
    .catch((err) => {
      console.error(err)
    })
}

checkPromise();
 */


//ASYNC/AWAIT
/* import fetch  from 'node-fetch';

const getTodos = async () => {
  const response = await fetch('https://jsonplaceholder.typicode.com/todos')

  if (response.status >= 200 && response.status < 300) {
    const todosObject = await response.json();

    console.log('Request succeeded with JSON response', todosObject.slice(0, 9))

  } else {
    console.log('Error')
  }
}

getTodos() */

/* fetch('https://jsonplaceholder.typicode.com/todos')
  .then(status)
  .then(json)
  .then((data) => { console.log('Request succeeded with JSON response', data.slice(0, 9)) })
  .catch((error) => { console.log('Request failed', error) })

  const promiseFunc = () => {
    return new Promise((resolve) => {
        setTimeout(() => resolve('I did something'), 3000)
    })
}
 */


// для работы с переменными окружения

const logger = require('./logger.js')
require('dotenv').config({path: '.env.local'} );

const { createProgressBar, updateProgressBar, stopProgressBar } = require('./progressBar.js');
const { FIGMA_TOKEN } = process.env;

const FIGMA_API_HOST = 'https://api.figma.com/v1';
const { FIGMA_KEY } = process.env;
const PAGE_NAME = 'Icons';
const BASE_DIR = '/static';

const Types = {
  Positive: "positive",
  Negative: "negative",
};

const DIRECTORIES_BY_TYPES = {
  [Types.Positive]: 'positive/',
  [Types.Negative]: 'negative/',
}

// для работы с сетевыми запросами
const superagent = require('superagent');

// для формирования путей для выгрузки иконки
const path = require('path');

// для работы с файловой системой
const fs = require('fs/promises');

//Получаем страницы фигмы
// **1. Функция для загрузки иконок из Figma:**
const uploadIcons = async () => {
  // **1.1. HTTP-клиент для работы с API Figma:**
  const agent = superagent.agent();
  // **1.2. Получение документа Figma:**
  let figmaDocument;
  try {
    figmaDocument = (
      await agent
        .get(`${FIGMA_API_HOST}/files/${FIGMA_KEY}`)
        .set('X-FIGMA-TOKEN', FIGMA_TOKEN)
    ).body.document.children; // Дочерние элементы страницы
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  // **1.3. Получение списка названий папок:**
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

  console.log(folderName);

  //Получаем url исконки
  // **1.5. Получение ссылок на SVG-изображения иконок:**
  let iconsData = [];

  try {
    // **1. Получение ссылок на SVG-изображения иконок:**
    const iconUrls = (
      await agent
        .get(`${FIGMA_API_HOST}/images/${FIGMA_KEY}`)
        .query({
          // **1.1. Список ID иконок:**
          ids: icons.map(({ id }) => id).join(','),
          format: 'svg', // Формат - SVG
        })
        .set('X-FIGMA-TOKEN', FIGMA_TOKEN)
    ).body.images;
    // **2. Формирование данных об иконках:**
    iconsData = icons.map(icon => ({
      // **2.1. Копирование данных иконки:**
      ...icon,
      // **2.2. Добавление ссылки на SVG:**
      url: iconUrls[icon.id],
    }));
  } catch (error) {
    // **3. Обработка ошибки:**
    console.error(error);
    process.exit(1);
  }
  // **1.6. Путь к папке для сохранения иконок:**
  const folderPath = path.join(process.cwd(), BASE_DIR);
  const icon = iconsData[0];
  const extension = '.svg';
  const iconSvg = (await agent.get(icon.url)).body;
  const iconName = `${icon.name.replaceAll(/ |\//g, '')}${extension}`;

 // **1.8. Создание папки для иконок:**
  await fs.mkdir(folderPath);
  // **1.9. Сохранение SVG-кода первой иконки:**
  await fs.writeFile(
  path.join(folderPath, iconName),
  iconSvg
  ); // Сохранить SVG-код первой иконки


}

uploadIcons()

