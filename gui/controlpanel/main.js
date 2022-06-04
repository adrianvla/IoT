$(document).ready(function () {
    $.get('/getip', function (data) {
        console.log(data);
        $('#qrcode-link').attr('href', data);
        var qrcode = new QRCode(document.getElementById("qrcode"), {
            text: data,
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    });
});

var everything = {};

setInterval(function () {
    $.get('/everything', function (data) {
        data = JSON.parse(data);
        everything.sessions = data.s;
        $('#activesessions').text('');
        everything.sessions.forEach(function (s) {
            var el = $(`
            <div id="` + s + `-c"><span>` + s + `</span><button>Kick</button></div>
            `)[0];
            $('#activesessions').append(el);
            $('#' + s + '-c button').on('click', function () {
                $.post('/kickSession', {
                    session: s
                }, function (data) {
                    Toastify({

                        text: "Success! Will change in some time...",

                        duration: 3000

                    }).showToast();
                });
            });
        });
    });
}, 2000);

(async function () {
    var videoStream = await navigator.mediaDevices.getUserMedia({
        video: true
    });
    /*
    try{
        videoStream = await navigator.mediaDevices.getUserMedia({ video: {
            facingMode: {
              exact: 'environment'
            }
        }});
    }catch(e){
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true});
    }*/

    document.getElementById('camera').srcObject = videoStream;


})();

setInterval(function () {

    const canvas = document.querySelector('#canvas')
    canvas.width = document.getElementById('camera').videoWidth
    canvas.height = document.getElementById('camera').videoHeight
    canvas.getContext('2d').drawImage(document.getElementById('camera'), 0, 0);
    //canvas.toDataURL('image/jpeg',0.5)
    console.log(canvas.toDataURL('image/jpeg',0.5));
    $.post('/cam', JSON.stringify({d:canvas.toDataURL('image/jpeg',0.1)}), async function (data) {
        console.log(data);
    });
}, 1000);