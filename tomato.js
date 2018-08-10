#!/usr/bin/env node

const request = require('request-promise-native');
const chalk = require('chalk');

const argv = require('minimist')(process.argv.slice(2));
const open = require('open');
const readline = require('readline');

const jsdom = require('jsdom');
const {JSDOM} = jsdom;


if(!argv._.length) return;

switch(argv._[0]) {
  case 'when':
    openShowtimes();
    break;
  case 'ls':
    listFilms();
    break;
  case 'imdb':
    openImdb();
    break;
  case 'tue':
    tuesday();
    break;
}

function listFilms() {
  request('https://www.rottentomatoes.com/api/private/v2.0/browse?maxTomato=100&maxPopcorn=100&services=amazon%3Bhbo_go%3Bitunes%3Bnetflix_iw%3Bvudu%3Bamazon_prime%3Bfandango_now&certified&sortBy=popularity&type=cf-in-theaters')
  .then((response)=>{
      response = JSON.parse(response);

      let i=0;
      response.results.forEach((film)=>{
        i++;
        let output = chalk.blue(`(${i}) `);
        output = output + chalk.blue(film.title);
        output = output + `\n     ${film.tomatoScore}% - ${film.mpaaRating}\n`;
        //output = output + film.synopsis + '\n\n';
        output = output.replace(/(<([^>]+)>)/ig,"");
        console.log(output);
      });

      queryAndOpenRT(response.results);

  });

}

function queryAndOpenRT(results) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('? ', (resp) => {
    const idx = parseInt(resp);
    rl.close();

    open(`https://www.rottentomatoes.com/${results[idx-1].url}`);

    queryAndOpenRT(results);
  });
}

function openImdb() {
  const query = argv._[1];
  let imdbUrl = `https://www.imdb.com/find?q=${query}`;
  open(imdbUrl);
}

function openShowtimes() {
  const query = argv._[1];
  let showtimesUrl = `https://www.google.com/search?q=${query}+showtimes`;
  open(showtimesUrl);
}

function tuesday() {
  const theaters = [
    {
      id: 'ci0005105',
      name: 'Sandy Movies 9'
    },
    {
      id: 'ci0014244',
      name: 'Thanksgiving Point Megaplex'
    },
    {
      id: 'ci0010304',
      name: 'Jordan Commons Megaplex'
    }
  ];

  let movies = [];
  const promises = [];

  theaters.forEach((theater)=>{
    const promise = getTheaterData(theater.id).then((theaterData)=>{
      theaterData.forEach((theaterMovie)=>{
        let movieObj = movies.find((movieObj)=>{
          return movieObj.title === theaterMovie.title;
        });

        if(movieObj){
          movieObj.showtimes.push({theater: theater.name, times: theaterMovie.showtimes});
        } else {
          movies.push({
            title: theaterMovie.title,
            metascore: theaterMovie.metascore,
            showtimes: [
              {
                theater: theater.name,
                times: theaterMovie.showtimes
              }
            ]
          });
        }
      });

    });
    promises.push(promise);
 });

 Promise.all(promises).then(()=>{
   movies.sort((a,b)=>{
    if(a.title < b.title) return -1;
    if(a.title > b.title) return 1;
    return 0;
   });

   movies = movies.filter((movie)=>{
    return movie.metascore >= 60;
   });

   movies.forEach((movie)=>{
    console.log(chalk.blue(movie.title) + " " + movie.metascore + " Metascore");
    movie.showtimes.forEach((showtimesObj)=>{
      console.log(showtimesObj.theater + " " + showtimesObj.times.join(" "));
    });
    console.log("\n");
   });
 });


}

function getTheaterData(theaterId) {
  let showDate = getTuesdayShowDate();
  return request(`https://www.imdb.com/showtimes/cinema/US/${theaterId}/${showDate}`)
  .then((response) => {
    const movies = [];

    const dom = new JSDOM(response);
    const movieDivs = dom.window.document.querySelectorAll('div.list_item');
    for(let i = 0; i<movieDivs.length; i++) {
      const div = movieDivs[i];
      let title = div.querySelector('h3 a').textContent;
      let showtimeLinks = div.querySelectorAll('div.showtimes > a');
      const showtimes = [];
      for(let j =0; j<showtimeLinks.length; j++){
        showtimes.push(showtimeLinks[j].textContent);
      }

      const metascoreSpan = div.querySelector('span.metascore');
      let metascore;
      if(metascoreSpan) {
        metascore = parseInt(div.querySelector('span.metascore').textContent);
      }

      movies.push({title, showtimes, metascore});
    }

    return movies;

  });
}

function getTuesdayShowDate() {
  const today = new Date();
  const day = today.getDay();
  let tuesday;
  switch(day){
    case 0:
      tuesday = today.setDate(today.getDate() + 2);
      break;
    case 1:
      tuesday = today.setDate(today.getDate() + 1);
      break;
    case 2:
      tuesday = today.setDate(today.getDate());
      break;
    case 3:
      tuesday = today.setDate(today.getDate() + 6);
      break;
    case 4:
      tuesday = today.setDate(today.getDate() + 5);
      break;
    case 5:
      tuesday = today.setDate(today.getDate() + 4);
      break;
    case 6:
      tuesday = today.setDate(today.getDate() + 3);
      break;
  }

  let showDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getUTCFullYear()}`;

  let pad = "00";
  let padMonth = "" + (today.getMonth() + 1);
  padMonth = pad.substring(0, pad.length - padMonth.length) + padMonth;
  let padDate = "" + today.getDate();
  padDate = pad.substring(0, pad.length - padDate.length) + padDate;

  showDate = today.getUTCFullYear() + '-' + padMonth + '-' + padDate;

  return showDate;
}
