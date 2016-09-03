// Draft scraper
var request  = require('request'),
    cheerio  = require('cheerio'),
    validate = require('./validate');

exports.get = function(leagueType, leagueId, season, callback) {

  var url;
  // Validate a callback exists if not then we are expecting a URL
  if (typeof callback === typeof undefined) {
    callback = leagueId;
    if (!validate.url('draft', leagueType)) { return callback('Invalid URL.'); }
    url = leagueType;
  } else {
    // Validate all required paramters
    if (!validate.leagueType(leagueType)) { return callback('Invalid league type.'); }
    if (!validate.leagueId(leagueId))     { return callback('Invalid league ID.'); }
    if (!validate.season(season))         { return callback('Invalid season.'); }
    url = 'http://www.fleaflicker.com/' + leagueType + '/leagues/' + leagueId + '/drafts?season=' + season;;
  };

  // Call to cheerio for the league
  request(url, function(error, response, body) {
    if (error || response.statusCode !== 200) {
      return callback(error ? error : 'Status Code: ' + response.statusCode);
    }
    // Continue as normal
    $ = cheerio.load(body);
    // Extract basic draft information
    var draft = {
      league: {
        id: parseInt(url.match(/leagues\/(\d{6})/)[1]),
        name: $('#top-bar-container ul.breadcrumb li.active').text()
      },
      teams: [],
      picks: []
    };

    // Loop through each row to push them onto the draft object
    // The team names will be in the first set, be sure to grab those first.
    var round = 0;
    var pick = 1;
    $('#table_0 TR').each(function () {
      if (typeof $(this).attr('id') !== "undefined") {
        if (round == 1) {
          draft.teams.push({
            id: parseInt($(this).find('.league-name a').attr('href').match(/teams\/(\d{6,7})/)[1]),
            name: $(this).find('.league-name a').text().trim()
          });
        }
        draft.picks.push({
          round: round,
          pick: {
            overall: pick,
            round: $(this).find('.info').text().match(/([^\s]+)[1]/)
          },
          team: {
            id: parseInt($(this).find('.league-name a').attr('href').match(/teams\/(\d{6,7})/)[1]),
            name: $(this).find('.league-name a').text().trim()
          },
          player: {
            id: null,
            name: $(this).find('a.player-text').text(),
            position: $(this).find('.position').text(),
            playerTeam: $(this).find('.player-team').text(),
          }
        });
        pick++;
      }
      else if ($(this).find('h3').text().match(/Round (\d{1,2})/)) {
        // If we see a round increment, then let's bump it up!
        round++;
      }
    });

    // Return the completed draft
    return callback(null, draft);
  });

};