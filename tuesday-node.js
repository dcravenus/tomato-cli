const request = require("request-promise-native");
const chalk = require("chalk");

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

module.exports = async function tuesday(minScore = 60) {
  const config = {
    theaters: [
      {
        id: "ci0005105",
        name: "Sandy Movies 9"
      },
      {
        id: "ci0014244",
        name: "Thanksgiving Point Megaplex"
      },
      {
        id: "ci0010304",
        name: "Jordan Commons Megaplex"
      },
      {
        id: "ci0012318",
        name: "American Fork Cinemark"
      },
      {
        id: "ci0010268",
        name: "Provo Town Centre Mall Cinemark"
      },
      {
        id: "ci0014231",
        name: "South Jordan Megaplex - The District"
      }
    ],

    minScore
  };

  const theaters = config.theaters;

  let movies = [];
  const promises = [];

  theaters.forEach(theater => {
    const promise = getTheaterData(theater.id).then(theaterData => {
      theaterData.forEach(theaterMovie => {
        let movieObj = movies.find(movieObj => {
          return movieObj.title === theaterMovie.title;
        });

        if (movieObj) {
          movieObj.showtimes.push({ theater: theater.name, times: theaterMovie.showtimes });
        } else {
          movies.push({
            title: theaterMovie.title,
            metascore: theaterMovie.metascore,
            mpaaRating: theaterMovie.mpaaRating,
            runtime: theaterMovie.runtime,
            imgUrl: theaterMovie.imgURL,
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

  return Promise.all(promises).then(() => {
    movies.sort((a, b) => {
      if (a.title < b.title) return -1;
      if (a.title > b.title) return 1;
      return 0;
    });

    movies = movies.filter(movie => {
      return movie.metascore >= config.minScore;
    });

    movies.sort((a, b) => {
      return (a.metascore - b.metascore) * -1;
    });

    return movies;
  });
};

function getTheaterData(theaterId) {
  let showDate = getTuesdayShowDate();
  return request(`https://www.imdb.com/showtimes/cinema/US/${theaterId}/${showDate}`).then(
    response => {
      const movies = [];

      const dom = new JSDOM(response);
      const movieDivs = dom.window.document.querySelectorAll("div.list_item");
      for (let i = 0; i < movieDivs.length; i++) {
        const div = movieDivs[i];
        let title = div.querySelector("h3 a").textContent;
        let showtimeLinks = div.querySelectorAll("div.showtimes > a");
        const showtimes = [];
        for (let j = 0; j < showtimeLinks.length; j++) {
          showtimes.push(showtimeLinks[j].textContent);
        }

        const metascoreSpan = div.querySelector("span.metascore");
        let metascore;
        if (metascoreSpan) {
          metascore = parseInt(div.querySelector("span.metascore").textContent);
        }

        let mpaaRatingTag = div.querySelector("img.certimage");
        let mpaaRating = "";
        if (mpaaRatingTag) {
          mpaaRating = mpaaRatingTag.title;
        }

        const runtimeTag = div.querySelector("p.cert-runtime-genre time");
        let runtime = "";
        if (runtimeTag) {
          runtime = runtimeTag.textContent;
        }

        const imgTag = div.querySelector("div.image img");
        let imgURL = imgTag.src;

        movies.push({ title, showtimes, metascore, mpaaRating, runtime, imgURL });
      }

      return movies;
    }
  );
}

function getTuesdayShowDate() {
  const today = new Date();
  const day = today.getDay();
  let tuesday;
  switch (day) {
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

  showDate = today.getUTCFullYear() + "-" + padMonth + "-" + padDate;

  return showDate;
}
