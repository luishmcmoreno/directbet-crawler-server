var express = require('express');
var router = express.Router();
var cheerio = require('cheerio');
var request = require('request');

router.get('/', function (req, res) {
	var db = req.db;
	var events = db.get('events');
	events.find({}, '-odds', function (err, docs) {
		if (err) {
			res.status(400).send(err);
		} else {
			res.send(docs);
		}
	});
});

router.get('/:id', function (req, res) {
	var db = req.db;
	var events = db.get('events');
	events.find({ id: req.params.id }, function (err, docs) {
		if (err) {
			res.status(400).send(err);
		} else {
			res.send(docs);
		}
	});
});

/* GET users listing. */
router.post('/:id', function (req, res) {
	var db = req.db;
	var events = db.get('events');
	request('https://www.directbet.eu/Event.cshtml?EventID='+ req.params.id, function (error, response, body) {
		if (!error) {
			var $ = cheerio.load(body);
			var eventTitle = $('#css3menu4 a').text().replace(/\s\s+/g, ' ').trim();
			var bets = [];
			var betTypes = $('#css3menu5').each(function () {
				var type = $(this).find('.event-header').text().replace(/\s\s+/g, ' ').trim().replace('LIVE', '').replace('!', '');
				$(this).find('li.topmenu a').each(function () {
					var bet = $(this).find('span').html();
					bet = bet.split('@');
					var title = bet[0].trim();
					var odd = Number(bet[1].trim());
					bets.push({
						type: type,
						odd: odd,
						bet: title,
						timestamp: (new Date()).getTime()
					});
				});
			});
			var promise = events.update({
				id: req.params.id
			}, {
				$push: {
					odds: {
						$each: bets
					}
				}
			}, function (err, doc) {
				console.log(err, doc);
				if (!doc) {
					events.insert({
						id: req.params.id,
						title: eventTitle,
						odds: bets
					}, function (err, doc) {
						if (err) {
							res.status(400).send(error);
						} else {
							res.send('Created');
						}
					});
				} else {
					res.send('Updated');
				}
			});		
		} else {
			res.status(400).send(error);
		}
	});
});

module.exports = router;
