# IoT
Like Apple Home Kit, but free and for raspberry-pi. Control everything in your house with one click from your smartphone.

To run it, type
```bash
node main.js
``` 
while being in the same directory

After that, open your browser and go to http://localhost if you want to access your dashboard. Enter your password (default : 1234).
If you wish to open it on your phone, go to your ip on your LAN network ( {your computer's name}.local or go to the NGROK link shown in the console).


Change the function 
```js

function ChangePin(iot, val, color) {
    console.log(iot + ' ' + val + ' ' + color);
    //iot is the device ID that you get in data.json
    //val is the brightness
    //color is the hex color
    if(color){

    }else{

    }
}
```
to use whatever gpio you'd like (I2C, ...)

Runs on localhost (for raspberrypi / windows)

If you download you agree to https://creativecommons.org/licenses/by-nc-sa/4.0/

If you want to change the password, change it here:

```js
var passwd = '1234'; // Change 1234 in what you'd like
```


Change also the gps.position file

Uses NGROK if you want to change something or toggle something in your house, when you're not at home

Add a user (in users.json file) : 
```js
{
    "LIST":[ //list of users
        // "USER",
        "USER2"
    ],
    "DATA":{
        /* EXAMPLE
        "USER":[
            { //device
                "id": "5db4d113-e2da-427c-aa00-6df1abfb3a98", //device id
                "icon": "HTML SVG ELEMENT HERE",
                "name": "PC",
                "status": false, //on or off
                "value": 100, //brightness
                "usecolor": false,
                "automatic": false //toggles on or off automatically
            }
        ],
        */
        "USER2":[
            {
                "id": "7be17a1e-e764-4ffb-a460-af9b777d0240", //device id
                "icon": "HTML SVG ELEMENT HERE",
                "name": "Water", // name of the device
                "status": true,
                "value": 70,
                "usecolor": true,
                "color": "#f00",
                "automatic": false
            }
        ]
    }
}

```
 more info at https://www.morisinc.net/IoT
 
