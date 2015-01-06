# World of Farmcraft #

An online multiplayer 3D isometric farm game built with Node.js

- Features an infinite persisted map generated live when accessing unexplored areas.
- Improved visibility by rotating the map in 4 different angles.
- Implements A* algorithm for path finding as characters can move in 8 directions.
- Animate players and allow interactions.
- Includes day/night transitions and animated natural disasters such as tornados for more realism.
- Farmers can perform up to 12 actions with 6 different buildings and plants.

## Requirements ##
- [Node.js](http://nodejs.org/)
- [Socket.IO](https://www.npmjs.com/package/socket.io) 0.9.13
- [MySQL](https://www.npmjs.com/package/mysql) 2.0.0
- [eyes](https://www.npmjs.com/package/eyes) 0.1.8
- [Response](https://www.npmjs.com/package/response) 0.1.0
- [sesh](https://www.npmjs.com/package/sesh) 0.1.0
- [Nodemailer](https://www.npmjs.com/package/nodemailer) 0.3.42

## Getting started ##
1. Set database credentials in the `/server/lib/db.js` file.
2. Import the files `/database/db.sql` and `/database/trigger.sql` to setup the database (change the delimiter to `$$` for the triggers).
3. Open a terminal and run the command `npm install` to install all dependencies.
4. Set the credentials of an email account in the `/server/lib/mail.js` file.
5. Navigate to the `server` folder and run the command `node launch.js` to start the server.

## How to play ##
1. Open a browser to the following url: `localhost:1337`.
2. Login or create an account thanks to the register button.
3. Enjoy :)

## Screenshots ##
Gameplay:
![Gameplay](http://joeyclouvel.com/supinfo/wof/gameplay.png)
Assistive notifications:
![Assistive notifications](http://joeyclouvel.com/supinfo/wof/assistive-notifications.png)
Some of the sprites (all vector created except the character):
![Some of the items](http://joeyclouvel.com/supinfo/wof/items.png)

## About ##
- This project is an assignment for [Supinfo International University](http://www.supinfo.com).
- World of Warcraft and its original logo are trademarks of [Blizzard Entertainment, Inc](http://blizzard.com).