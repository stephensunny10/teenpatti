
var express = require('express');
var _ = require("lodash");
var cards = require("./cards");
var bcrypt = require('bcryptjs');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var shortId = require('shortid');
var bodyParser = require('body-parser');
let referralCodeGenerator = require('referral-code-generator')
var MongoClient = require('mongodb').MongoClient;
var uri = "mongodb+srv://john:9UmSVdNkiT4nJRzB@cluster0.vdojp.mongodb.net/TeenPatti?retryWrites=true&w=majority";

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

app.set('port', process.env.PORT || 8001);

app.get('/', function (req, res) {
	console.log(" Client connecting....");
	res.send("Hello express");
});

const mysql = require('mysql');
const pool = mysql.createPool({
	host: '185.224.137.122',
	user: 'u564056537_tuser',
	password: '5IE|nXI26eU~',
	database: 'u564056537_tpatti',
});

var clients = [];
var currVersion=5;
var apkUrl="https://drive.google.com/file/d/164_IrSfwkNe6xqX318MHDMJ6u9qVZZOj/view?usp=sharing";

var totalCards2 = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", '14', "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25",
	"26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "50", "51"];
var PLAYER_LIST = {};


app.get("/online", function (req, res) {
	res.json(clients);
});


setInterval(function () {
	for (var i in PLAYER_LIST) {
		var lSocket = PLAYER_LIST[i];
		if (lSocket.adapter.rooms[lSocket.room] != undefined) {
			lSocket.adapter.rooms[lSocket.room].searchOne = 0;
		}
	}
	var ch3 = true;
	for (var i in PLAYER_LIST) {
		if (ch3) {
			var lSocket = PLAYER_LIST[i];
			if (lSocket.adapter.rooms[lSocket.room] != undefined) {
				if (lSocket.adapter.rooms[lSocket.room].play == "1") {
					ch3 = false;
					console.log("sds " + lSocket.adapter.rooms[lSocket.room].searchPlayers);
					lSocket.adapter.rooms[lSocket.room].searchPlayers -= 1;
					if (lSocket.adapter.rooms[lSocket.room].searchPlayers <= 0)
						lSocket.adapter.rooms[lSocket.room].searchPlayers = 0;
					var lsearch = lSocket.adapter.rooms[lSocket.room].searchPlayers;
					//if (lsearch == 0) {
					var sitPos = 0;
					for (var j in PLAYER_LIST) {
						var lSocket2 = PLAYER_LIST[j];
						if (lSocket.room == lSocket2.room && lSocket2.adapter.rooms[lSocket2.room].play == "1") {
							if (lSocket2.bot == 0) {
								var sta;
								if (lSocket2.standby == 0)
									sta = "center"; else sta = "yes";
								lSocket2.emit("Player_Connect", {
									name: lSocket2.username, total_chips: lSocket2.total_chips, socket_id: lSocket2.id,
									sittingPos: (lSocket2.seat - 1), watch: lSocket2.watch, standby: lSocket2.standby, status: sta
								});
								lSocket2.broadcast.in(lSocket2.room).emit("OtherPlayer_Connect", {
									name: lSocket2.username, total_chips: lSocket2.total_chips, socket_id: lSocket2.id,
									sittingPos: (lSocket2.seat - 1), watch: lSocket2.watch, status: sta, standby: lSocket2.standby
								});
								lSocket2.emit("PlayerSort", { seat: (lSocket2.seat - 1) });
							}
							sitPos++;
							if (lsearch == 0) {
								if (Total_Player(lSocket2.room, 3) <= sitPos) {
									console.log("enen ");
									if (Total_Player(lSocket2.room, 3) >= 2)
										lSocket.adapter.rooms[lSocket.room].play = "2";
									else
										lSocket.adapter.rooms[lSocket.room].play = "0";
								}
							}
						}
					}

				}
			}
		}
	}
	//Waiting after & Card pass shuffle
	var ch2 = true;
	for (var j in PLAYER_LIST) {
		var lSocket2 = PLAYER_LIST[j];
		if (ch2) {
			var socRoom = lSocket2.adapter.rooms[lSocket2.room];
			if (socRoom != undefined) {
				if (socRoom.play == "2" && socRoom.searchOne == 0) {
					socRoom.searchOne = 1;
					lSocket.emit("GameStartTimer", { timer: "Game start in " + (5 - socRoom.gameTimer) + " seconds." });
					lSocket.broadcast.in(lSocket.room).emit("GameStartTimer", { timer: "Game start in " + (5 - socRoom.gameTimer) + " seconds." });
					socRoom.gameTimer += 1;
					if (socRoom.gameTimer > 5) {
						socRoom.gameTimer = 0;
						if (socRoom.length >= 2) {
							for (var k in PLAYER_LIST) {
								var lSocket3 = PLAYER_LIST[k];
								var sroom = lSocket3.adapter.rooms[lSocket3.room];
								if (sroom.play == "2" && lSocket2.room == lSocket3.room) {
									sroom.potValue += sroom.bootValue;
									lSocket3.total_chips -= sroom.bootValue;
									Updated_Chips(lSocket3, lSocket3.email, lSocket3.total_chips);
									lSocket3.emit("StartBootAmount", {
										bootValue: socRoom.bootValue,
										potValue: socRoom.potValue, seat: (lSocket3.seat - 1), total_chips: lSocket3.total_chips
									});
									lSocket3.broadcast.in(lSocket2.room).emit("StartBootAmount", {
										bootValue: socRoom.bootValue,
										potValue: socRoom.potValue, seat: (lSocket3.seat - 1), total_chips: lSocket3.total_chips
									});
								}
							}
							ch2 = false;
							socRoom.play = "3";
							var ccVal1 = false;
							var ccVal2 = false;
							for (var k in PLAYER_LIST) {
								var lSocket3 = PLAYER_LIST[k];
								if (socRoom.dealerValue == (lSocket3.seat - 1))
									ccVal1 = true;
								if (socRoom.curPlyValue == (lSocket3.seat - 1))
									ccVal2 = true;
							}
							if (!ccVal1)
								nextDealerValue(socRoom, lSocket2);
							if (!ccVal2)
								nextCurrPlayer(socRoom, lSocket2);
						} else {
							ch2 = false;
							socRoom.play = "0";
						}
					}
				} else if (socRoom.play == "3") {
					var shuStr = "";
					for (var k = 0; k < 52; k++) {
						var temp = totalCards2[k];
						var randomIndex = Math.floor(Math.random() * (52 - k));
						totalCards2[k] = totalCards2[randomIndex];
						totalCards2[randomIndex] = temp;
					}
					for (var k = 0; k < 52; k++) {
						var temp = totalCards2[k];
						shuStr = shuStr + temp + " ";
					}
					socRoom.shuffle = shuStr;
					lSocket2.emit("Start_CardPass", { shuffle: shuStr, dealer: socRoom.dealerValue, seat: (lSocket2.seat - 1) });
					lSocket2.broadcast.in(lSocket2.room).emit("Start_CardPass", { shuffle: shuStr, dealer: socRoom.dealerValue, seat: (lSocket2.seat - 1) });
					for (var k in PLAYER_LIST) {
						var lSocket3 = PLAYER_LIST[k];
						var sroom = lSocket3.adapter.rooms[lSocket3.room];
						if (sroom.play == "3" && lSocket2.room == lSocket3.room) {

							lSocket3.emit("PassStr", { seat: (lSocket3.seat - 1) });
							lSocket3.broadcast.in(lSocket3.room).emit("PassStr", { seat: (lSocket3.seat - 1) });
						}
					}
					lSocket2.adapter.rooms[lSocket2.room].play = "4";

					ch2 = false;
				} else if (socRoom.play == "4") {
					socRoom.waitingCount -= 1;
					//console.log("wait " + socRoom.waitingCount + " " + socRoom.length);
					if (socRoom.waitingCount == 0) {
						if (socRoom.length >= 2) {
							ch2 = false;
							socRoom.play = "5";
							socRoom.waitingCount = 5;
							console.log("start play");
							lSocket2.emit("Start_Play", {});
							lSocket2.broadcast.in(lSocket2.room).emit("Start_Play", {});
						} else {
							socRoom.play = "0";
							socRoom.waitingCount = 5;
							socRoom.searchPlayers = 5;
						}
					}
					ch2 = false;
				}
			}
		}
	}
}, 1000);

//Game Timer
setInterval(function () {
	for (var j in PLAYER_LIST) {
		var lSocket2 = PLAYER_LIST[j];
		var socRoom = lSocket2.adapter.rooms[lSocket2.room];
		if (socRoom != undefined && lSocket2.watch == 0) {

			var cChe = false;
			if (socRoom.length >= 2) {
				if (socRoom.curPlyValue == (lSocket2.seat - 1)) {
					cChe = true;
				}
			} else {
				cChe = true;
			}

			if (socRoom.play == "5" && cChe) {
				//console.log("cplay " + socRoom.curPlyValue);
				var chipsCheck;
				if (socRoom.gameTimer == 0) {
					chipsCheck = checkTotal_Chips(socRoom, lSocket2);
					console.log("karthik " + chipsCheck + " " + socRoom.curPlyValue + " " + lSocket2.total_chips);
					if (chipsCheck == 1) {
						lSocket2.out = 0;
						lSocket2.emit("StartGameTimer", {
							cPlay: socRoom.curPlyValue, blindVal: socRoom.blindValue, chalVal: socRoom.chaalValue, seen:
								lSocket2.seen, show: showFunc(lSocket2), sideShow: sideShowFunc(lSocket2)
						});
						lSocket2.broadcast.in(lSocket2.room).emit("StartGameTimer", {
							cPlay: socRoom.curPlyValue, blindVal: socRoom.blindValue,
							chalVal: socRoom.chaalValue, seen: lSocket2.seen, show: showFunc(lSocket2), sideShow: sideShowFunc(lSocket2)
						});
					} else {
						socRoom.gameTimer = 19;
					}
				}
				socRoom.gameTimer += 1;
				var intvalue = Math.floor(socRoom.gameTimer);
				if (intvalue >= 20) {
					var chValue = false;
					if (lSocket2.out == 1) {
						chValue = true;
						lSocket2.sideshow = 0;
						lSocket2.emit("EndGameTimer", { cPlay: socRoom.curPlyValue });
						lSocket2.broadcast.in(lSocket2.room).emit("EndGameTimer", { cPlay: socRoom.curPlyValue });
						if (intvalue > 20) {
							lSocket2.emit("RedGameTimerClose", { cPlay: socRoom.curPlyValue });
							lSocket2.broadcast.in(lSocket2.room).emit("RedGameTimerClose", { cPlay: socRoom.curPlyValue });
							var pp = checkPacked(lSocket2);
							if (pp == 1)
								lSocket2.adapter.rooms[lSocket2.room].play = "6";
						}
						if (chipsCheck == 0) {
							lSocket2.pack = 1;
							lSocket2.emit("CallPack", { seat: (lSocket2.seat - 1) });
							lSocket2.broadcast.in(lSocket2.room).emit("CallPack", { seat: (lSocket2.seat - 1) });
							lSocket2.emit("Instruction", { instr: lSocket2.name + " not enough chips" });
							lSocket2.broadcast.in(lSocket2.room).emit("Instruction", { instr: lSocket2.name + " not enough chips" });
							lSocket2.emit("TimeOut", { nochips: "Not Enough chips", time: "0" });
							var pp = checkPacked(lSocket2);
							if (pp == 1)
								lSocket2.adapter.rooms[lSocket2.room].play = "6";
							else
								chValue = true;

						}
					} else {
						if (intvalue == 20) {
							lSocket2.emit("RedGameTimer", { cPlay: socRoom.curPlyValue });
							lSocket2.broadcast.in(lSocket2.room).emit("RedGameTimer", { cPlay: socRoom.curPlyValue });
						} else if (intvalue >= 30) {
							lSocket2.emit("RedGameTimerClose", { cPlay: socRoom.curPlyValue });
							lSocket2.broadcast.in(lSocket2.room).emit("RedGameTimerClose", { cPlay: socRoom.curPlyValue });
							lSocket2.pack = 1;
							var pp = checkPacked(lSocket2);
							if (pp == 1)
								lSocket2.adapter.rooms[lSocket2.room].play = "6";
							else
								chValue = true;
							lSocket2.emit("CallPack", { seat: (lSocket2.seat - 1) });
							lSocket2.broadcast.in(lSocket2.room).emit("CallPack", { seat: (lSocket2.seat - 1) });
							/*var roomCount2 = PLAYER_LIST[j].adapter.rooms[PLAYER_LIST[j].room];
							if (roomCount2 != undefined)
								console.log("dddd " + roomCount2.length);*/
							//delete PLAYER_LIST[j];
							lSocket2.emit("TimeOut", { nochips: "You are Timed Out", time: "1" });
						}
					}
					if (chValue) {
						socRoom.gameTimer = 0;
						nextCurrPlayer(socRoom, lSocket2);
					}
				}
			} else if (socRoom.play == "6") {
				console.log("win 666");
				lSocket2.emit("Win", { win: (socRoom.winPlayer - 1), potValue: socRoom.potValue, winStr: socRoom.winStr });
				lSocket2.broadcast.in(lSocket2.room).emit("Win", { win: (socRoom.winPlayer - 1), potValue: socRoom.potValue, winStr: socRoom.winStr });
				socRoom.play = "7";
				socRoom.waitingCount = 15;
			} else if (socRoom.play == "7") {
				socRoom.waitingCount -= 1;
				if (socRoom.waitingCount == 0) {
					var tCount = 0;
					for (var i = 0; i < 8; i++) {
						lSocket2.emit("PlusBtn", { status: "no", seat: i });
					}
					for (var k in PLAYER_LIST) {
						var lSocket3 = PLAYER_LIST[k];
						if (lSocket3.room == lSocket2.room && lSocket3.standby == 0) {
							lSocket3.seen = 0;
							lSocket3.pack = 0;
							lSocket3.out = 0;
							lSocket3.sideshow = 0;
							lSocket3.watch = 0;
							lSocket3.asked = 0;
							lSocket3.bot = 0;
							lSocket3.carStr1 = "";
							lSocket3.carStr2 = "";
							lSocket3.carStr3 = "";
							tCount += 1;
							if (lSocket3.total_chips < (socRoom.bootValue * 2)) {
								lSocket3.emit("Instruction", { instr: lSocket3.name + " not enough chips" });
								lSocket3.broadcast.in(lSocket3.room).emit("Instruction", { instr: lSocket3.name + " not enough chips" });
								lSocket3.emit("TimeOut", { nochips: "Not Enough chips", time: "0" });
							}
							lSocket3.emit("PlusBtn", { status: "yes", seat: (lSocket3.seat - 1) });
						}
					}


					lSocket2.emit("ResetGame", {});
					lSocket2.broadcast.in(lSocket2.room).emit("ResetGame", {});
					/*var lSocket3;
					for (var k in PLAYER_LIST) {
						if (PLAYER_LIST[k].room == PLAYER_LIST[k].room) {
							lSocket3 = PLAYER_LIST[k]
						}
					}*/
					if (tCount >= 2) {
						nextDealerValue(socRoom, lSocket2);
						nextCurrPlayer(socRoom, lSocket2);
					}
					socRoom.searchPlayers = 2;
					socRoom.waitingCount = 3;
					socRoom.gameTimer = 0;
					socRoom.potValue = 0;
					socRoom.chaalValue = socRoom.bootValue;
					socRoom.blindValue = socRoom.bootValue;
					socRoom.winPlayer = 0;
					socRoom.winStr = "";
					socRoom.shuffle = "";
					socRoom.roundCount = 0;
					if (tCount >= 2) {
						socRoom.play = "1";
						lSocket2.emit("Instruction", { instr: " Next Round is Start" });
						lSocket2.broadcast.in(lSocket2.room).emit("Instruction", { instr: " Next Round is Start" });

						lSocket2.emit("PlayerSort", {});
						lSocket2.broadcast.in(lSocket2.room).emit("PlayerSort", {});
					} else {
						socRoom.play = "0";
						for (var k in PLAYER_LIST) {
							var lSocket3 = PLAYER_LIST[k];
							if (lSocket3.room == lSocket2.room) {
								console.log(lSocket3.username);
								if (lSocket3.standby == 1)
									lSocket3.watch = 1;
								lSocket3.emit("OtherPlayer_Connect", {
									name: lSocket3.username, total_chips: lSocket3.total_chips, socket_id: lSocket3.id,
									sittingPos: (lSocket3.seat - 1), watch: lSocket3.watch, status: "yes", standby: lSocket3.standby
								});
								lSocket3.broadcast.in(lSocket3.room).emit("OtherPlayer_Connect", {
									name: lSocket3.username, total_chips: lSocket3.total_chips, socket_id: lSocket3.id,
									sittingPos: (lSocket3.seat - 1), watch: lSocket3.watch, status: "yes", standby: lSocket3.standby
								});
							}
						}
						lSocket2.emit("Instruction", { instr: " No Other Player to Start" });
						lSocket2.broadcast.in(lSocket2.room).emit("Instruction", { instr: "  No Other Player to Start" });
					}
				}
			}
		}
	}
}, 1000);

function checkTotal_Chips(socRoom, lSocket2) {
	var currValue = 0; var chipEnoughValue = 0;
	if (lSocket2.seen == 0)
		currValue = socRoom.blindValue;
	else if (lSocket2.seen == 1)
		currValue = socRoom.chaalValue;

	if (lSocket2.total_chips >= currValue)
		chipEnoughValue = 1;

	return chipEnoughValue;
}
function sideShowFunc(lSocket2) {
	var seenCount = 0; var totalPla = 0;
	for (var k in PLAYER_LIST) {
		var lSocketShow = PLAYER_LIST[k];
		if (lSocket2.room == lSocketShow.room && lSocketShow.watch == 0) {
			if (lSocketShow.seen == 1 && lSocketShow.pack == 0)
				seenCount += 1;
			totalPla += 1;
		}
	}
	if (seenCount == 3 && totalPla >= 3)
		seenCount = 3;
	else
		seenCount = 0;
	return seenCount;
}
function sideShowFunc2(socRoom, lSocket2) {
	var showAsed = 0;
	var localCPlay = socRoom.curPlyValue;
	var k = socRoom.curPlyValue - 1;
	var kk = 0;
	var eChe = true;
	while (eChe) {
		if (k < 0)
			k = 4;
		for (var i in PLAYER_LIST) {
			var lSocket = PLAYER_LIST[i];
			if ((lSocket.seat - 1) == k && lSocket.room == lSocket2.room && lSocket.seen == 1 && lSocket.pack == 0 && localCPlay != k) {
				eChe = false;
				showAsed = k;
			}
		}
		k -= 1;
		kk += 1;
		if (kk > 5)
			eChe = false;
	}
	return showAsed;
}

function showFunc(lSocket2) {
	var seenCount = 0; var totalPla = 0;
	for (var k in PLAYER_LIST) {
		var lSocketShow = PLAYER_LIST[k];
		if (lSocket2.room == lSocketShow.room && lSocketShow.watch == 0) {
			if (lSocketShow.seen == 1 && lSocketShow.pack == 0)
				seenCount += 1;
			if (lSocketShow.pack == 0)
				totalPla += 1;
		}
	}

	if (seenCount == 2 && totalPla == 2)
		seenCount = 2;
	else
		seenCount = 0;
	return seenCount;
}
function nextDealerValue(socRoom, lSocket2) {
	var localCPlay = socRoom.dealerValue;
	var eChe = true;
	while (eChe) {
		socRoom.dealerValue += 1;
		if (socRoom.dealerValue >= 12)
			socRoom.dealerValue = 0;
		for (var i in PLAYER_LIST) {
			var lSocket = PLAYER_LIST[i];
			if (socRoom.dealerValue == (lSocket.seat - 1) && lSocket.room == lSocket2.room && localCPlay != socRoom.dealerValue) {
				eChe = false;
			}
		}
	}
}

function nextCurrPlayer(socRoom, lSocket2) {
	var localCPlay = socRoom.curPlyValue;
	var eChe = true;
	var releaseCount = 0;
	while (eChe) {
		socRoom.curPlyValue += 1;
		if (socRoom.curPlyValue >= 12)
			socRoom.curPlyValue = 0;
		for (var k in PLAYER_LIST) {
			var lSocket4 = PLAYER_LIST[k];
			//console.log("cc " + socRoom.curPlyValue + " " + (lSocket4.seat - 1));
			if (socRoom.curPlyValue == (lSocket4.seat - 1) && lSocket2.room == lSocket4.room && localCPlay != socRoom.curPlyValue &&
				lSocket4.watch == 0 && lSocket4.pack == 0)
				eChe = false;
		}
		releaseCount += 1;
		if (releaseCount >= 15)
			eChe = false;
	}

	if (socRoom.play == "5") {
		if (socRoom.dealerValue == socRoom.curPlyValue)
			socRoom.roundCount += 1;
		if (socRoom.roundCount >= socRoom.maxBlind) {
			for (var k in PLAYER_LIST) {
				var lSocket4 = PLAYER_LIST[k];
				if (lSocket2.room == lSocket4.room && lSocket4.pack == 0 && lSocket4.watch == 0 && lSocket4.seen == 0) {
					lSocket4.emit("BlindSee", {});
				}
			}
		}
	}
}
function checkPacked(chPack) {
	var pCount = 0;
	var cCount = chPack.adapter.rooms[chPack.room];
	var playerCount = 0;
	for (var i in PLAYER_LIST) {
		var lSocket = PLAYER_LIST[i];
		var socRoom = lSocket.adapter.rooms[lSocket.room];
		if (socRoom != undefined) {
			if (chPack.room == lSocket.room) {
				if (lSocket.pack == 1)
					pCount += 1;
				if (lSocket.standby == 1) {
					playerCount += 1;
				} else {
					if (lSocket.watch == 0)
						playerCount += 1;
				}
			}
		}
	}
	if ((playerCount - pCount) == 1) {
		for (var i in PLAYER_LIST) {
			var lSocket = PLAYER_LIST[i];
			var socRoom = lSocket.adapter.rooms[lSocket.room];
			if (socRoom != undefined) {
				if (chPack.room == lSocket.room && lSocket.watch == 0) {
					if (lSocket.pack == 0) {
						var poValue = chPack.adapter.rooms[chPack.room].potValue;
						var perc = (poValue / 100.0);
						var comm = perc * (100 - lSocket.commission);
						lSocket.cash += comm;
						var comm2 = perc * lSocket.commission;
						InsertCommission(lSocket, comm2);
						Updated_Cash(lSocket, lSocket.email, comm);
						lSocket.emit("Update_Total_Chips", { seat: (lSocket.seat - 1), total_chips: lSocket.total_chips });
						lSocket.broadcast.in(lSocket.room).emit("Update_Total_Chips", { seat: (lSocket.seat - 1), total_chips: lSocket.total_chips });
						chPack.adapter.rooms[chPack.room].winPlayer = lSocket.seat;
					}
				}
			}
		}
	}
	return playerCount - pCount;
}

function potLimitWinPlayer(winPlay, lSocket2) {
	for (var i in PLAYER_LIST) {
		var lSocket = PLAYER_LIST[i];
		var socRoom = lSocket.adapter.rooms[lSocket.room];
		if (socRoom != undefined) {
			if (lSocket2.room == lSocket.room && winPlay == (lSocket.seat - 1)) {
				var poValue = socRoom.potValue;
				var perc = (poValue / 100.0);
				var comm = perc * (100 - lSocket.commission);
				lSocket.cash += comm;
				var comm2 = perc * lSocket.commission;
				InsertCommission(lSocket2, comm2);
				Updated_Cash(lSocket, lSocket.email, comm);
				lSocket.emit("Update_Total_Chips", { seat: (lSocket.seat - 1), total_chips: lSocket.total_chips });
				lSocket.broadcast.in(lSocket.room).emit("Update_Total_Chips", { seat: (lSocket.seat - 1), total_chips: lSocket.total_chips });
				lSocket.adapter.rooms[lSocket.room].winPlayer = lSocket.seat;

				lSocket.emit("Instruction", { instr: "Maximum pot reached" });
				lSocket.broadcast.in(lSocket.room).emit("Instruction", { instr: "Maximum pot reached" });
			}
		}
	}
}
function Total_Player(droom, side) {
	var playerCount = 0;
	for (var i in PLAYER_LIST) {
		var lSocket = PLAYER_LIST[i];
		if (side == 1) {
			if (lSocket.room == droom) {
				if (lSocket.watch == 0)
					playerCount += 1;
			}
		} else if (side == 2)
			playerCount += 1;
		else if (side == 3) {
			if (lSocket.room == droom) {
				if (lSocket.standby == 0)
					playerCount += 1;
			}
		}

	}
	return playerCount;
}

io.on('connection', function (socket) {
	//checkConnection();
	//var arStr="8s";
	//var handNormal = scoreHandsNormal(["Td", "Jd", "6h"]);
	//console.log("hands " + handNormal.score + " " + handNormal.name);



	console.log("server connected");
	socket.emit("Server_Started", {currVersion:currVersion,apkUrl:apkUrl});
	socket.on("Server_Started", function () {
		//socket.emit("Server_Started");
	});


	socket.on("Room", function (data) {

		var alreadyPlay = false;
		for (var j in PLAYER_LIST) {
			var lSocket = PLAYER_LIST[j];
			//console.log(" dd "+data.room+" "+data.email+" "+lSocket.room+" "+lSocket.email);
			if (lSocket.email == data.email) {
				alreadyPlay = true;
				//console.log("more users");
			}
		}
		//console.log("room " + data.room);
		if (alreadyPlay) {
			//socket.emit("AlreadyPlay", {});
		} else {
			var ch2 = true;
			var roomStart = 1;
			var roomEnd = 100;

			/*if (data.privateStr == "yes") {
				roomStart = parseInt(data.room);
				roomEnd = parseInt(data.room);
			}*/

			//for (var i = roomStart; i <= roomEnd && ch2; i++) {
			var i = parseInt(data.room);
			//console.log("roomid " + data.room);
			var roomSocket = io.sockets.adapter.rooms[i + ""];
			if (roomSocket == undefined) {
				socket.join(i + "");
				socket.emit("RoomConnected", { room: parseInt(i + "") });
				socket.adapter.rooms[i + ""].dealerValue = 0;
				socket.adapter.rooms[i + ""].play = "0";
				socket.adapter.rooms[i + ""].searchPlayers = 2;
				socket.adapter.rooms[i + ""].waitingCount = 3;
				socket.adapter.rooms[i + ""].gameTimer = 0;
				socket.adapter.rooms[i + ""].curPlyValue = 0;
				socket.adapter.rooms[i + ""].bootValue = parseInt(data.BootAmt);
				socket.adapter.rooms[i + ""].potValue = 0;
				socket.adapter.rooms[i + ""].chaalValue = parseInt(data.BootAmt);
				socket.adapter.rooms[i + ""].blindValue = parseInt(data.BootAmt);
				socket.adapter.rooms[i + ""].winPlayer = 0;
				socket.adapter.rooms[i + ""].winStr = "";
				socket.adapter.rooms[i + ""].shuffle = "";
				socket.adapter.rooms[i + ""].roundCount = 0;
				socket.adapter.rooms[i + ""].maxBlind = parseInt(data.MaxBlind);
				socket.adapter.rooms[i + ""].potLimit = parseInt(data.PotLimit);
				socket.adapter.rooms[i + ""].chaalLimit = parseInt(data.ChaalLimit);
				socket.adapter.rooms[i + ""].limitType = data.limitType;
				socket.adapter.rooms[i + ""].roomid = data.room;
				socket.adapter.rooms[i + ""].searchOne = 0;
				ch2 = false;
			} else {
				if (roomSocket.length < 6 && data.room == socket.adapter.rooms[i + ""].roomid) {
					socket.join(i + "");
					socket.emit("RoomConnected", { room: parseInt(i + "") });
					ch2 = false;
				}
			}
			//}
		}
	});
	socket.on("EnterRoom", function (data) {
		var roomStart = 1000000;
		var roomEnd = 5000000;

		var ch2 = true;
		var fRoom;
		for (var i = roomStart; i <= roomEnd && ch2; i++) {
			var roomSocket = io.sockets.adapter.rooms[i + ""];
			if (roomSocket == undefined) {
				if (data.switchTable == "yes") {
					if (i > parseInt(data.room)) {
						fRoom = i;
						ch2 = false;
					}
				} else {
					fRoom = i;
					ch2 = false;
				}
			} else {
				if (data.switchTable == "yes") {
					if (i > parseInt(data.room)) {
						fRoom = i;
						ch2 = false;
					}
				} else {
					fRoom = i;
					ch2 = false;
				}

			}
		}

		var che = false;
		for (var j in PLAYER_LIST) {
			var lSocket2 = PLAYER_LIST[j];
			if (lSocket2.room == fRoom) {
				console.log("karr ");
				che = true;
				socket.emit("OtherPlayer_Connect", {
					name: lSocket2.username, total_chips: lSocket2.total_chips, socket_id: lSocket2.id,
					sittingPos: (lSocket2.seat - 1), watch: lSocket2.watch, room: lSocket2.room, rstatus: "yes"
				});
			}
		}
		socket.emit("LocalRoom", {
			room: fRoom
		});


	});

	socket.on("EnterRoomTwo", function (data) {
		//console.log("roo " + data.room);
		var che = false;
		for (var j in PLAYER_LIST) {
			var lSocket2 = PLAYER_LIST[j];
			if (lSocket2.room == data.room) {
				che = true;
				socket.emit("OtherPlayer_Connect", {
					name: lSocket2.username, total_chips: lSocket2.total_chips, socket_id: lSocket2.id,
					sittingPos: (lSocket2.seat - 1), watch: lSocket2.watch, status: "yes"
				});
			}
		}

	});

	socket.on("Player_Connect", function (data) {
		var fName = socket.adapter.rooms[data.room];
		socket.room = data.room;
		socket.total_chips = parseInt(data.total_chips);
		socket.balance_chips = parseInt(data.balance);
		socket.cash = parseInt(data.cash);
		socket.name = data.name;
		socket.username = data.username;
		socket.seat = parseInt(data.seat);
		socket.seen = 0;
		socket.pack = 0;
		socket.out = 0;
		socket.bonusRate = parseInt(data.bonusRate);
		socket.sideshow = 0;
		socket.asked = 0;
		socket.email = data.email;
		if (socket.standby == undefined)
			socket.standby = 0;
		socket.carStr1 = "";
		socket.carStr2 = "";
		socket.carStr3 = "";
		socket.playMode = data.playMode;
		socket.commission = parseInt(data.commission);
		socket.profile_img = data.profile_img;
		socket.bot = 0;
		if (socket.adapter.rooms[data.room].play == "2" || socket.adapter.rooms[data.room].play == "3" ||
			socket.adapter.rooms[data.room].play == "4" || socket.adapter.rooms[data.room].play == "5")
			socket.watch = 1;
		else
			socket.watch = 0;

		PLAYER_LIST[socket.id] = socket;

		socket.emit("YOU", { seat: (socket.seat - 1) });

		if (socket.watch == 0) {
			socket.emit("Player_Connect", {
				name: socket.username, total_chips: data.total_chips, socket_id: socket.id, sittingPos: (socket.seat - 1),
				playerImg: socket.profile_img
			});
			socket.broadcast.in(data.room).emit("OtherPlayer_Connect", {
				name: socket.username, total_chips: data.total_chips, socket_id: socket.id, sittingPos: (socket.seat - 1), playerImg: socket.profile_img,
				status: "center"
			});
		} else {
			for (var i in PLAYER_LIST) {
				var lSocket = PLAYER_LIST[i];
				if (lSocket.room == socket.room) {
					lSocket.emit("WatchPlayer", {
						name: lSocket.name, total_chips: lSocket.total_chips, seat: (lSocket.seat - 1), watch: lSocket.watch,
						seen: lSocket.seen, playerImg: lSocket.profile_img
					});
					lSocket.broadcast.in(data.room).emit("WatchPlayer", {
						name: lSocket.name, total_chips: lSocket.total_chips, seat: (lSocket.seat - 1),
						watch: lSocket.watch, seen: lSocket.seen, playerImg: lSocket.profile_img
					});
				}
			}
			socket.emit("WatchPlayer2", { seat: (socket.seat - 1), shuffle: fName.shuffle });
		}
		//var roomCount = io.sockets.adapter.rooms[data.room];
		//if (roomCount != undefined) {
		if (Total_Player(socket.room, 3) >= 1 && socket.adapter.rooms[data.room].play == 0)
			socket.adapter.rooms[data.room].play = "1";
		//}
		//console.log("log" + roomCount.length);
	});
	socket.on("CardSeen", function () {
		PLAYER_LIST[socket.id].seen = 1;
		var lVar = PLAYER_LIST[socket.id].adapter.rooms[socket.room];
		lVar.chaalValue = lVar.blindValue * 2;
		socket.emit("CardSeen", {
			seat: (PLAYER_LIST[socket.id].seat - 1), show: showFunc(socket), sideShow: sideShowFunc(socket),
			chaalValue: lVar.chaalValue
		});
		socket.broadcast.in(socket.room).emit("CardSeen", {
			seat: (PLAYER_LIST[socket.id].seat - 1), show: showFunc(socket), sideShow: sideShowFunc(socket),
			chaalValue: lVar.chaalValue
		});
		//console.log("CardSeen on" + PLAYER_LIST[socket.id].seat);
	});
	socket.on("CallChaal", function (data) {
		var sInt = parseInt(data.chValue);
		var lVar;
		if (PLAYER_LIST[socket.id].seen == 0) {
			PLAYER_LIST[socket.id].adapter.rooms[socket.room].blindValue = sInt;
			lVar = PLAYER_LIST[socket.id].adapter.rooms[socket.room].blindValue;
			PLAYER_LIST[socket.id].adapter.rooms[socket.room].potValue += sInt;
		} else {
			PLAYER_LIST[socket.id].adapter.rooms[socket.room].chaalValue = sInt;
			lVar = PLAYER_LIST[socket.id].adapter.rooms[socket.room].chaalValue;
			PLAYER_LIST[socket.id].adapter.rooms[socket.room].potValue += sInt;
		}
		PLAYER_LIST[socket.id].total_chips -= lVar;
		Updated_Chips(PLAYER_LIST[socket.id], PLAYER_LIST[socket.id].email, PLAYER_LIST[socket.id].total_chips);
		PLAYER_LIST[socket.id].out = 1;
		socket.emit("CallChaal", {
			seat: (PLAYER_LIST[socket.id].seat - 1), passVal: lVar, potValue: PLAYER_LIST[socket.id].adapter.rooms[socket.room].potValue,
			total_chips: PLAYER_LIST[socket.id].total_chips
		});
		socket.broadcast.in(socket.room).emit("CallChaal", {
			seat: (PLAYER_LIST[socket.id].seat - 1), passVal: lVar, potValue: PLAYER_LIST[socket.id].adapter.rooms[socket.room].potValue,
			total_chips: PLAYER_LIST[socket.id].total_chips
		});
		//console.log("CallChaal on" + sInt);
		PLAYER_LIST[socket.id].adapter.rooms[socket.room].gameTimer = 20;

		if (PLAYER_LIST[socket.id].adapter.rooms[socket.room].potValue >= PLAYER_LIST[socket.id].adapter.rooms[socket.room].potLimit) {
			console.log("ll " + PLAYER_LIST[socket.id].adapter.rooms[socket.room].limitType);
			if (PLAYER_LIST[socket.id].adapter.rooms[socket.room].limitType == "Limited") {
				socket.emit("PotLimit", {});

			}
		} else if (PLAYER_LIST[socket.id].adapter.rooms[socket.room].chaalValue >= PLAYER_LIST[socket.id].adapter.rooms[socket.room].chaalLimit) {
			//socket.emit("PotLimit", {});
		}
	});

	socket.on("CallPack", function () {
		PLAYER_LIST[socket.id].pack = 1;
		var pp = checkPacked(PLAYER_LIST[socket.id]);
		if (pp == 1)
			PLAYER_LIST[socket.id].adapter.rooms[socket.room].play = "6";
		socket.emit("CallPack", { seat: (PLAYER_LIST[socket.id].seat - 1), standby: PLAYER_LIST[socket.id].standby });
		socket.broadcast.in(socket.room).emit("CallPack", { seat: (PLAYER_LIST[socket.id].seat - 1), standby: PLAYER_LIST[socket.id].standby });
		console.log("CallPack on" + PLAYER_LIST[socket.id].seat);
		PLAYER_LIST[socket.id].out = 1;
		PLAYER_LIST[socket.id].adapter.rooms[socket.room].gameTimer = 20;
	});
	socket.on("SHOW", function (data) {
		var count = 0;
		var resOne;
		var resTwo;
		var handNormal1;
		var handNormal2;
		for (var k in PLAYER_LIST) {
			var lSocketShow = PLAYER_LIST[k];
			if (socket.room == lSocketShow.room && lSocketShow.watch == 0) {
				if (lSocketShow.seen == 1 && lSocketShow.pack == 0) {
					console.log("karthid " + lSocketShow.carStr1 + lSocketShow.carStr2 + lSocketShow.carStr3 + " " + (lSocketShow.seat - 1));
					if (count == 0) {
						resOne = lSocketShow.seat - 1;
						handNormal1 = scoreHandsNormal([lSocketShow.carStr1, lSocketShow.carStr2, lSocketShow.carStr3]);
					} else if (count == 1) {
						resTwo = lSocketShow.seat - 1;
						handNormal2 = scoreHandsNormal([lSocketShow.carStr1, lSocketShow.carStr2, lSocketShow.carStr3]);
					}
					count += 1;
				}
			}
		}
		var winShow;
		var winStr;
		if (handNormal1.score > handNormal2.score) {
			winShow = resOne;
			winStr = handNormal1.name;
		} else {
			winShow = resTwo;
			winStr = handNormal2.name;
		}

		console.log("mmm " + handNormal1.score + " " + handNormal2.score);

		PLAYER_LIST[socket.id].adapter.rooms[socket.room].winStr = winStr;
		socket.emit("SHOW", { winStr: winStr, win: winShow });
		socket.broadcast.in(socket.room).emit("SHOW", { winStr: winStr, win: winShow });
		console.log("winn " + winShow);
		var ch2 = true;
		for (var i in PLAYER_LIST) {
			if (ch2) {
				var lSocket = PLAYER_LIST[i];
				if (socket.room == lSocket.room && lSocket.watch == 0 && (lSocket.seat - 1) != winShow && lSocket.pack != 1) {
					lSocket.pack = 1;
					var pp = checkPacked(lSocket);
					if (pp == 1)
						PLAYER_LIST[socket.id].adapter.rooms[socket.room].play = "6";
					lSocket.emit("CallShow", { seat: (lSocket.seat - 1) });
					lSocket.broadcast.in(socket.room).emit("CallShow", { seat: (lSocket.seat - 1) });
					ch2 = false;
				}
			}
		}
	});
	socket.on("STANDBY", function (data) {
		PLAYER_LIST[socket.id].watch = data.watch;
		PLAYER_LIST[socket.id].standby = data.standby;
		console.log("standdd ");
		socket.emit("Instruction", { instr: PLAYER_LIST[socket.id].username + " is watching" });
		socket.broadcast.in(PLAYER_LIST[socket.id].room).emit("Instruction", { instr: PLAYER_LIST[socket.id].username + " is watching" });
	});
	socket.on("STR", function (data) {
		//console.log("str " + data.carStr1);
		PLAYER_LIST[socket.id].carStr1 = data.carStr1;
		PLAYER_LIST[socket.id].carStr2 = data.carStr2;
		PLAYER_LIST[socket.id].carStr3 = data.carStr3;
	});
	socket.on("BotPassStr", function (data) {
		var handNormal = scoreHandsNormal([data.carStr1, data.carStr2, data.carStr3]);
		socket.emit("BotPassStr", { seat: data.seat, score: handNormal.score, name: handNormal.name });
	});
	socket.on("SIDESHOW", function () {
		PLAYER_LIST[socket.id].sideshow = 1;
		PLAYER_LIST[socket.id].out = 1;
		PLAYER_LIST[socket.id].adapter.rooms[socket.room].gameTimer = 10;
		if (sideShowFunc(socket) == 3) {
			var askValue = sideShowFunc2(PLAYER_LIST[socket.id].adapter.rooms[socket.room], socket);
			PLAYER_LIST[socket.id].asked = askValue;
			console.log("ask " + askValue + " current" + (socket.seat - 1));
			var ch2 = true;
			for (var i in PLAYER_LIST) {
				if (ch2) {
					var lSocket = PLAYER_LIST[i];
					if (socket.room == lSocket.room && (lSocket.seat - 1) == askValue) {
						console.log("ask " + (lSocket.seat - 1));
						lSocket.emit("AskSideShow", { seat: (socket.seat - 1), name: socket.name });
						ch2 = false;
					}
				}
			}
		}
	});
	socket.on("ACCEPT", function (data) {
		var currentUser;
		var clients2 = [];
		for (var k in PLAYER_LIST) {
			var lSocketShow = PLAYER_LIST[k];
			if (socket.room == lSocketShow.room && lSocketShow.watch == 0) {
				if (lSocketShow.pack == 0 && ((lSocketShow.seat - 1) == data.ask || (lSocketShow.seat - 1) == data.you)) {
					var handNormal = scoreHandsNormal([lSocketShow.carStr1, lSocketShow.carStr2, lSocketShow.carStr3]);
					currentUser = {
						seat: lSocketShow.seat - 1,
						name: handNormal.name,
						score: handNormal.score,
					}
					clients2.push(currentUser);
				}
			}
		}
		var temp;
		for (var i = 0; i < clients2.length - 1; i++) {
			for (var j = i + 1; j < clients2.length; j++) {
				if (clients2[i].score < clients2[j].score) {
					temp = clients2[i];
					clients2[i] = clients2[j];
					clients2[j] = temp;

				}
			}
		}

		console.log();
		PLAYER_LIST[socket.id].adapter.rooms[socket.room].gameTimer = 19;
		var ch2 = true;
		for (var i in PLAYER_LIST) {
			if (ch2) {
				var lSocket = PLAYER_LIST[i];
				if (socket.room == lSocket.room && (lSocket.seat - 1) == clients2[1].seat) {
					lSocket.pack = 1;
					lSocket.emit("CallPack", { seat: (lSocket.seat - 1) });
					lSocket.broadcast.in(socket.room).emit("CallPack", { seat: (lSocket.seat - 1) });
					ch2 = false;
				}
			}
		}
	});

	socket.on("RemovePlayer", function (data) {

		var totPCount = 0;
		for (var i in PLAYER_LIST)
			totPCount += 1;
		for (var i in PLAYER_LIST) {
			var lSocket = PLAYER_LIST[i];
			var socRoom = lSocket.adapter.rooms[lSocket.room];
			if (socRoom != undefined && lSocket.room == socket.room) {

				if (socRoom.play == "0") {
					socket.emit("StandUp", { seat: (socket.seat - 1), dealer: socRoom.dealerValue, cards: "no" });
				} else if (socRoom.play == "2") {
					if (totPCount <= 2) {
						socRoom.searchPlayers = 5;
						socRoom.play = "0";
					}
					socket.emit("StandUp", { seat: (socket.seat - 1), dealer: socRoom.dealerValue, cards: "no" });
					socket.broadcast.in(socket.room).emit("StandUp", { seat: (socket.seat - 1), dealer: socRoom.dealerValue, cards: "no" });
				} else if (socRoom.play == "4") {
					lSocket.pack = 1;
					socket.emit("StandUp", { seat: (socket.seat - 1), dealer: socRoom.dealerValue });
					socket.broadcast.in(socket.room).emit("StandUp", { seat: (socket.seat - 1), dealer: socRoom.dealerValue });

					var pp = checkPacked(lSocket);
					if (pp == 1)
						socRoom.play = "6";
				} else if (socRoom.play == "5") {
					if (socket.id == lSocket.id && socket.watch == 0) {
						lSocket.pack = 1;
						var pp = checkPacked(lSocket);
						if (pp == 1)
							socRoom.play = "6";
						socket.emit("StandUp", { seat: (socket.seat - 1), dealer: socRoom.dealerValue });
						socket.broadcast.in(socket.room).emit("StandUp", { seat: (socket.seat - 1), dealer: socRoom.dealerValue });
						if (lSocket.sideshow == 1) {
							socket.emit("SideShowRemove", { asked: lSocket.asked });
							socket.broadcast.in(socket.room).emit("SideShowRemove", { asked: lSocket.asked });
						}
						if (totPCount > 2) {
							socRoom.gameTimer = 0;
							nextCurrPlayer(socRoom, socket);
						} else {
							socket.broadcast.in(lSocket.room).emit("Instruction", { instr: lSocket.name + " is out" });
						}
					}
				} else if (socRoom.play == "6" || socRoom.play == "7") {
					socRoom.waitingCount = 1;
					socket.emit("StandUp", { seat: (socket.seat - 1), dealer: socRoom.dealerValue, cards: "flip" });
					socket.broadcast.in(socket.room).emit("StandUp", { seat: (socket.seat - 1), dealer: socRoom.dealerValue, cards: "flip" });
				}
			}
		}

		delete PLAYER_LIST[socket.id];
		delete socket;
	});

	socket.on("PotLimit", function (data) {
		var currentUser;
		var clients2 = [];
		for (var k in PLAYER_LIST) {
			var lSocketShow = PLAYER_LIST[k];
			if (socket.room == lSocketShow.room && lSocketShow.watch == 0) {
				if (lSocketShow.pack == 0) {
					var handNormal = scoreHandsNormal([lSocketShow.carStr1, lSocketShow.carStr2, lSocketShow.carStr3]);
					currentUser = {
						seat: lSocketShow.seat - 1,
						name: handNormal.name,
						score: handNormal.score,
					}
					clients2.push(currentUser);

				}
			}
		}

		/*for (var i = 0; i < clients2.length; i++) {
			console.log("clie " + clients2[i].name + " " + clients2[i].score);
		}*/

		var temp;
		for (var i = 0; i < clients2.length - 1; i++) {
			for (var j = i + 1; j < clients2.length; j++) {
				if (clients2[i].score < clients2[j].score) {
					temp = clients2[i];
					clients2[i] = clients2[j];
					clients2[j] = temp;

				}
			}
		}

		for (var i = 0; i < clients2.length; i++) {
			console.log("clie2 " + clients2[i].name + " " + clients2[i].score);
		}

		potLimitWinPlayer(parseInt(clients2[0].seat), socket);
		PLAYER_LIST[socket.id].adapter.rooms[socket.room].play = "6";
		PLAYER_LIST[socket.id].adapter.rooms[socket.room].winStr = clients2[0].name;
	});
	socket.on("GetDocuments", function (data) {
		GetAllDocumentMongoDB(data, socket);
	});

	socket.on("UpdateChips", function (data) {
		Updated_Chips(PLAYER_LIST[socket.id], PLAYER_LIST[socket.id].email, data.total_chips);
	});
	socket.on("CHAT", function (data) {
		socket.broadcast.in(socket.room).emit("CHAT", { seat: (socket.seat - 1), msg: data.msg });
	});
	socket.on("UserRegister", function (data) {

		Register(data, socket);
	});

	socket.on("VerifyUser", function (data) {

		VerifyUser(data, socket, 0);
	});

	socket.on("WithdrawSearch", function (data) {
		WithdrawSearch(socket, data);
	});
	socket.on("Withdraw", function (data) {
		WithdrawMongoDB(socket, data);

	});

	socket.on("ChangeMobile", function (data) {
		ChangeMobileNumber(data, socket);
	});
	socket.on("CreateTable", function (data) {
		PrivateTable(socket, data);
	});

	socket.on("JoinPrivateRoom", function (data) {
		JoinRoom(socket, data);
	});
	
	socket.on("Get_Chips", function (data) {
		Get_Chips( data,socket);
	});


	socket.on("disconnect", function () {
		var totPCount = 0;
		for (var i in PLAYER_LIST)
			totPCount += 1;
		for (var i in PLAYER_LIST) {
			var lSocket = PLAYER_LIST[i];
			var socRoom = lSocket.adapter.rooms[lSocket.room];
			if (socRoom != undefined && lSocket.room == socket.room) {

				if (socRoom.play == "1") {
					if (totPCount <= 2) {
						socRoom.searchPlayers = 5;
						socRoom.play = "0";
					}
					socket.broadcast.in(socket.room).emit("PlayerOut", { seat: (socket.seat - 1), name: socket.name, play: socRoom.play });
				} else if (socRoom.play == "4") {
					lSocket.pack = 1;
					socket.emit("CallPack", { seat: (socket.seat - 1) });
					socket.broadcast.in(socket.room).emit("CallPack", { seat: (socket.seat - 1) });

					socket.broadcast.in(lSocket.room).emit("Instruction", { instr: lSocket.name + " is out" });
					var pp = checkPacked(lSocket);
					if (pp == 1)
						lSocket.adapter.rooms[socket.room].play = "6";
				} else if (socRoom.play == "5") {
					if (socket.id == lSocket.id && socket.watch == 0) {
						lSocket.pack = 1;
						var pp = checkPacked(lSocket);
						if (pp == 1)
							lSocket.adapter.rooms[socket.room].play = "6";
						socket.emit("CallPack", { seat: (socket.seat - 1) });
						socket.broadcast.in(socket.room).emit("CallPack", { seat: (socket.seat - 1) });
						if (lSocket.sideshow == 1) {
							socket.emit("SideShowRemove", { asked: lSocket.asked });
							socket.broadcast.in(socket.room).emit("SideShowRemove", { asked: lSocket.asked });
						}
						if (totPCount > 2) {
							socRoom.gameTimer = 0;
							nextCurrPlayer(socRoom, socket);
						} else {
							socket.broadcast.in(lSocket.room).emit("Instruction", { instr: lSocket.name + " is out" });
						}
					}
				}
			}
		}
		console.log("User has disconnected");
		delete PLAYER_LIST[socket.id];
	});
});

function Register(data, lSocket) {
	MongoClient.connect(uri, function (err, db) {
		var dbo = db.db("teenpatti");
		var query = { email: data.email };
		dbo.collection("player").find(query).toArray(function (err, result) {
			if (err) {
			} else {
				console.log("available user" + result.length);
				if (result.length == 0) {
					Register2(data, lSocket);
				} else {
					//lSocket.emit("AlreadyRegisterd", {});
				}
			}
			db.close();
		});
	});
}
function Register2(data, lSocket) {
	MongoClient.connect(uri, function (err, db) {
		var today = new Date();
		var pWord = bcrypt.hashSync(data.password, bcrypt.genSaltSync(8), null);
		var myobj = {
			firstname: data.name,
			username: data.username,
			email: data.email,
			password: pWord,
			mobile: data.mobile,
			chips: 10000,
			cash: 0,
			appId: "",
			lastname: "",
			isFbLogin: false,
			emailverified: false,
			emailme: false,
			status: "active",
			clubStatus: "",
			clubStatusValidTill: "",
			sessionId: "",
			socketId: "",
			bankName: "",
			accountNumber: "",
			accountHolderName: "",
			ifscCode: "",
			rating: 0,
			mobilelverified: false,
			tdsAmount: "0",
			updatedAt: today,
			createdAt: today,
			deviceId: "abcd",
			profilePic: "default.png",
			cashTransaction: "0",
			rewardPoint: 0,
			mobile: "",
			otp: 0,
		};
		var dbo = db.db("teenpatti");
		dbo.collection("player").insertOne(myobj, function (err, res) {
			if (err) {
			} else {
				VerifyUser(data, lSocket);
			}
			console.log("1 document inserted");
			db.close();
		});
	});
}

function VerifyUser(data, lSocket) {
	MongoClient.connect(uri, function (err, db) {
		var pWord = bcrypt.hashSync(data.password, bcrypt.genSaltSync(8), null);
		var dbo = db.db("teenpatti");
		//console.log(data.email + " " + data.password);
		var query = { email: data.email };
		dbo.collection("player").find(query).toArray(function (err, result) {
			if (err) {
				lSocket.emit("VerifyUser", { email: data.email, status: "no" });
			} else {
				if (result.length != 0) {
					const ppp = bcrypt.compareSync(data.password, result[0].password);
					if (ppp) {
						lSocket.emit("VerifyUser", {
							_id: result[0]._id, name: result[0].name, username: result[0].username, email: result[0].email, total_chips: result[0].chips,
							password: data.password, cash: result[0].cash, mobile: result[0].mobile, accountNumber: result[0].accountNumber, status: "yes",
							accountHolderName: result[0].accountHolderName, bankName: result[0].bankName, ifscCode: result[0].ifscCode,
						});
					} else {
						lSocket.emit("VerifyUser", { email: data.email, status: "no" });
					} 
				} else {
					lSocket.emit("VerifyUser", { email: data.email, status: "no" });
				}
			}
			//console.log(result);
			db.close();
		});
	});
}
function Get_Chips(data,lSocket) {
	MongoClient.connect(uri, function (err, db) {
		var dbo = db.db("teenpatti");
		var query = { email: data.email };
		dbo.collection("player").find(query).toArray(function (err, result) {
			if (err) {
			} else {
				if (result.length != 0) {
					var chValue = parseInt(result[0].chips, 10);
					lSocket.emit("Get_Chips", { total_chips: chValue });
					
				}
			}
			//console.log(result);
			db.close();
		});
	});
}
function Updated_Chips(lSocket, email, chips) {
	MongoClient.connect(uri, function (err, db) {
		var dbo = db.db("teenpatti");
		var myquery = { email: email };
		var newvalues = { $set: { chips: chips } };
		dbo.collection("player").updateOne(myquery, newvalues, function (error, result) {
			if (error) {
				console.log("error update document");
			} else {
				lSocket.emit("Update_Total_Chips", { seat: (lSocket.seat - 1), total_chips: chips });
			}
			db.close();
		});
	});
}

function Updated_Cash(lSocket, email, cash) {
	/*var sql = 'SELECT * FROM categories WHERE email = ?';
	pool.query(sql, [email], function (error, result, fields) {
		for (var i in result) {
			if (result[i].email == email) {
				var rCash = result[i].cash;
				rCash += cash;
				Updated_Cash2(lSocket, email, rCash);
				//lSocket.emit("VerifyUser", { name: result[i].name, email: result[i].email, total_chips: result[i].chips, cash: result[i].cash, login: data.login, status: "yes" });
			}
		}
	});*/

	MongoClient.connect(uri, function (err, db) {
		var dbo = db.db("teenpatti");
		var query = { email: email };
		dbo.collection("player").find(query).toArray(function (err, result) {
			if (err) {
			} else {
				if (result.length != 0) {
					var chValue = parseInt(result[0].cash, 10);
					chValue += parseInt(cash, 10);
					Updated_Cash2(lSocket, email, chValue);
				}
			}
			//console.log(result);
			db.close();
		});
	});
}
function Updated_Cash2(lSocket, email, cash) {
	/*var sql = "UPDATE categories set cash = ? WHERE email = ?";
	pool.query(sql, [cash, email], function (err, result) {
		//console.log("updated " + result);
		lSocket.emit("Update_Cash", { seat: (lSocket.seat - 1), cash: lSocket.cash });
	});*/
	MongoClient.connect(uri, function (err, db) {
		var dbo = db.db("teenpatti");
		var myquery = { email: email };
		var newvalues = { $set: { cash: cash } };
		dbo.collection("player").updateOne(myquery, newvalues, function (error, result) {
			if (error) {
				console.log("error update document");
			} else {
				lSocket.emit("Update_Cash", { seat: (lSocket.seat - 1), cash: cash });
			}
			db.close();
		});
	});
}



function GetAllDocumentMongoDB(data, lSocket) {
	MongoClient.connect(uri, function (err, db) {
		var empty = 0;
		if (err)
			console.log("not connected ");
		var dbo = db.db("teenpatti");
		dbo.collection("gameSettings").find({}).toArray(function (err, result) {
			for (var i = 0; i < result.length; i++) {
				lSocket.emit("GetDocuments", {
					id: result[i]._id, points: result[i].points, players: result[i].players, firstprize: result[i].firstprize,
					status: "yes"
				});
				empty = 1;
			}
			//console.log(result);
			db.close();
			if (empty == 0) {
				lSocket.emit("GetDocuments", { status: "no" });
			}
		});
	});
}

function GetTotalUsers(lSocket) {
	pool.query("SELECT * FROM categories", function (err, result, fields) {
		lSocket.emit("TotalUser", { users: result.length, currUsers: Total_Player(0, 2) });
	});
}

function WithdrawSearch(lSocket, data) {
	var sql = 'SELECT * FROM categories WHERE email = ?';
	pool.query(sql, [data.email], function (error, result, fields) {
		for (var i in result) {
			lSocket.emit("WithdrawSearch", { withdraw_limit: result[i].withdraw_limit });
		}
	});
}
function WithdrawMongoDB(lSocket, data) {
	MongoClient.connect(uri, function (err, db) {
		var dbo = db.db("teenpatti");
		var myobj = { playerId: data._id, amount: data.withdrawAmt, status: "Pending" };
		dbo.collection("withdrawHistory").insertOne(myobj, function (err, res) {
			if (!err) {
				WithdrawVerifyCash(data.email, data.withdrawAmt, data, lSocket);
				lSocket.emit("Withdraw", { status: "success" });
				console.log(res);
			} else {
				lSocket.emit("Withdraw", { status: "failed" });
			}
			console.log("1 document inserted");
			db.close();
		});
	});
}

function WithdrawVerifyCash(email, user_cash, data, lSocket) {
	MongoClient.connect(uri, function (err, db) {
		var dbo = db.db("teenpatti");
		var query = { email: email };
		dbo.collection("player").find(query).toArray(function (err, result) {
			if (err) {
			} else {
				if (result.length != 0) {
					var chValue = parseInt(result[0].cash, 10);
					chValue -= parseInt(user_cash, 10);
					console.log("cash " + result[0].email + " " + chValue);
					WithdrawUpdated_Cash(result[0].email, chValue, data, lSocket);
				}
			}
			//console.log(result);
			db.close();
		});
	});
}
function WithdrawUpdated_Cash(email, cash, data, lSocket) {
	MongoClient.connect(uri, function (err, db) {
		var dbo = db.db("teenpatti");
		var myquery = { email: email };
		var newvalues = { $set: { cash: cash } };
		dbo.collection("player").updateOne(myquery, newvalues, function (error, result) {
			if (error) {
				console.log("error update document");
			} else {
				console.log("update success");
			}
			db.close();
		});
	});
}

function ChangeMobileNumber(data, lSocket) {
	MongoClient.connect(uri, function (err, db) {
		var dbo = db.db("teenpatti");
		var myquery = { email: data.email };
		var newvalues = { $set: { mobile: data.editColName } };
		if (data.editPassStr == "MobileEdit")
			newvalues = { $set: { mobile: data.editColName } };
		else if (data.editPassStr == "AccNameEdit")
			newvalues = { $set: { accountHolderName: data.editColName } };
		else if (data.editPassStr == "BankNameEdit")
			newvalues = { $set: { bankName: data.editColName } };
		else if (data.editPassStr == "AccNumberEdit")
			newvalues = { $set: { accountNumber: data.editColName } };
		else if (data.editPassStr == "IfscEdit")
			newvalues = { $set: { ifscCode: data.editColName } };
		sql = "UPDATE categories set ifscCode = ? WHERE email = ?";
		dbo.collection("player").updateOne(myquery, newvalues, function (error, result) {
			if (error) {
				console.log("error update document");
			} else {
				//console.log("update success");
				lSocket.emit("ChangeMobile", { status: "success", changeStr: data.editColName, passStr: data.editPassStr });
			}
			db.close();
		});
	});
}
function InsertCommission(lSocket, comm) {
	var today = new Date();
	var post = {
		method: lSocket.username, commission: comm, game_name: "TeenPatti",
		created_At: today, updated_at: today
	};
	pool.query('INSERT INTO payment_methods SET ?', post, function (error, result, fields) {
		if (error) {

		} else {

		}
	});
}
function PrivateTable(lSocket, data) {
	var today = new Date();
	var rValue = Math.floor(Math.random() * 100000);
	rValue += 500000;
	var post = {
		room_id: rValue, email: data.email, table_name: data.tableType, boot_value: parseInt(data.BootAmt), max_blind: parseInt(data.MaxBlind), table_player: 8,
		created_At: today
	};
	pool.query('INSERT INTO private_table SET ?', post, function (error, result, fields) {
		if (error) {

		} else {
			lSocket.emit("CreateTable", { room_id: rValue });
			Updated_Chips(lSocket, data.email, parseInt(data.ptprice));
		}
	});
}
function JoinRoom(lSocket, data) {
	var sql = 'SELECT * FROM private_table WHERE room_id = ?';
	pool.query(sql, [data.room_id], function (error, result, fields) {
		if (error) {
			console.log("avai 1");
			lSocket.emit("JoinPrivateRoom", { status: "no" });
		} else {
			console.log("avai 2");
			for (var i in result)
				lSocket.emit("JoinPrivateRoom", { id: result[i].room_id, BootValue: result[i].boot_value, MaxBlind: result[i].max_blind, tablename: result[i].table_name, status: "yes" });

			if (result.length == 0) {
				lSocket.emit("JoinPrivateRoom", { status: "no" });
			}

		}
	});
}
function GetCommission(lSocket) {
	pool.query("SELECT * FROM settings", function (err, result, fields) {
		lSocket.emit("Settings", {
			commission: result[0].conversion_rate, bonusRate: result[0].currency, private_price: result[0].question_time,
			upgrade_url: result[0].completed_option
		});
	});
}
listOfUsers = function () {
	for (var i = 0; i < clients.length; i++) {
		console.log("Now " + clients[i].name + " ONLINE");
	}
	console.log('----------------------------------------');
}

server.listen(app.get('port'), function () {
	console.log("Server is Running : " + server.address().port);
});


function scoreHandsNormal(playerCards) {
	if (playerCards.length == 3) {
		var clonePlayerCards = _.sortBy(
			_.map(playerCards, function (n) {
				return cards.cardValue(n);
			}),
			"number"
		);
		var handStatus = {};

		var groupByNumber = _.groupBy(clonePlayerCards, "number");
		var groupByColor = _.groupBy(clonePlayerCards, "color");
		var sameNumberCount = _.keys(groupByNumber).length;
		var sameColorCount = _.keys(groupByColor).length;

		var diff1 = clonePlayerCards[1].number - clonePlayerCards[0].number;
		var diff2 = clonePlayerCards[2].number - clonePlayerCards[1].number;
		var isSequence =
			(diff1 == diff2 && diff2 == 1) ||
			(clonePlayerCards[0].number == 1 &&
				clonePlayerCards[1].number == 12 &&
				clonePlayerCards[2].number == 13);

		// High Card
		handStatus.no = 0;
		handStatus.name = "High Card";
		if (clonePlayerCards[0].number == 1) {
			handStatus.card1 = 14;
			handStatus.card2 = clonePlayerCards[2].number;
			handStatus.card3 = clonePlayerCards[1].number;
			handStatus.desc = "High Card of A";
		} else {
			handStatus.card1 = clonePlayerCards[2].number;
			handStatus.card2 = clonePlayerCards[1].number;
			handStatus.card3 = clonePlayerCards[0].number;
			handStatus.desc = "High Card of " + cards.keyToString(handStatus.card1);
		}

		// Pair
		if (sameNumberCount == 2) {
			handStatus.name = "Pair";
			handStatus.no = 1;
			for (var i = 0; i < 3; i++) {
				if (playerCards[i].charAt(1) == "s")
					handStatus.no += 0.2;
				else if (playerCards[i].charAt(1) == "h")
					handStatus.no += 0.15;
				else if (playerCards[i].charAt(1) == "d")
					handStatus.no += 0.1;
				else if (playerCards[i].charAt(1) == "c")
					handStatus.no += 0.05;
			}
			_.each(groupByNumber, function (n, key) {
				if (n.length == 2) {
					handStatus.card1 = parseInt(key);
					handStatus.desc = "Pair of " + cards.keyToString(key);
					if (key == "1") {
						handStatus.card1 = 14;
					}
				} else {
					handStatus.card2 = parseInt(key);
					if (key == "1") {
						handStatus.card2 = 14;
					}
				}
			});
			handStatus.card3 = 0;
		}

		// Color
		if (sameColorCount == 1) {
			handStatus.no = 2;
			for (var i = 0; i < 3; i++) {
				if (playerCards[i].charAt(1) == "s")
					handStatus.no += 0.2;
				else if (playerCards[i].charAt(1) == "h")
					handStatus.no += 0.15;
				else if (playerCards[i].charAt(1) == "d")
					handStatus.no += 0.1;
				else if (playerCards[i].charAt(1) == "c")
					handStatus.no += 0.05;
			}
			handStatus.name = "Color";
			handStatus.desc =
				"Color of " + cards.keyToString(handStatus.card1) + " High";
		}

		// Sequence
		if (isSequence) {
			if (
				clonePlayerCards[0].number == 1 &&
				clonePlayerCards[1].number == 2 &&
				clonePlayerCards[0].number == 1 &&
				clonePlayerCards[2].number == 3
			) {
				handStatus.card1 = 14;
				handStatus.card2 = clonePlayerCards[2].number;
				handStatus.card3 = clonePlayerCards[1].number;
			}

			handStatus.no = 3;
			for (var i = 0; i < 3; i++) {
				if (playerCards[i].charAt(1) == "s")
					handStatus.no += 0.2;
				else if (playerCards[i].charAt(1) == "h")
					handStatus.no += 0.15;
				else if (playerCards[i].charAt(1) == "d")
					handStatus.no += 0.1;
				else if (playerCards[i].charAt(1) == "c")
					handStatus.no += 0.05;
			}

			console.log(playerCards[0].charAt(1));

			handStatus.name = "Sequence";
			handStatus.desc =
				"Sequence of " + cards.keyToString(handStatus.card1) + " High";
		}

		// Pure Sequence
		if (sameColorCount == 1 && isSequence) {
			if (playerCards[0].charAt(1) == "s")
				handStatus.no = 4.2;
			else if (playerCards[0].charAt(1) == "h")
				handStatus.no = 4.15;
			else if (playerCards[0].charAt(1) == "d")
				handStatus.no = 4.1;
			else if (playerCards[0].charAt(1) == "c")
				handStatus.no = 4.05;

			handStatus.name = "Pure Sequence";
			handStatus.desc =
				"Pure Sequence of " + cards.keyToString(handStatus.card1) + " High";


			//var res = playerCards[0].charAt(1)
			//console.log(res);
		}

		// Trio
		if (sameNumberCount == 1) {

			handStatus.no = 5;
			for (var i = 0; i < 3; i++) {
				if (playerCards[i].charAt(1) == "s")
					handStatus.no += 0.2;
				else if (playerCards[i].charAt(1) == "h")
					handStatus.no += 0.15;
				else if (playerCards[i].charAt(1) == "d")
					handStatus.no += 0.1;
				else if (playerCards[i].charAt(1) == "c")
					handStatus.no += 0.05;
			}
			handStatus.name = "Trio";
			handStatus.desc = "Trio of " + cards.keyToString(handStatus.card1);
		}

		handStatus.score =
			handStatus.no * 1000000 +
			handStatus.card1 * 10000 +
			handStatus.card2 * 100 +
			handStatus.card3 * 1;
		return {
			name: handStatus.name,
			desc: handStatus.desc,
			score: handStatus.score,
		};
	} else {
		console.error(new Error("Number of cards in Score Hands Incorrect"));
	}
}
