// noinspection JSUnresolvedFunction

const UpdateSouvenirInterval = 1000;

const TogetherSouvenirStartTime = "2022-08-14 22:48:00";
const TogetherSouvenirMomentElementId = "together_souvenir_moment";

function updateTogetherSouvenir() {
  const diff = dayjs().diff(dayjs(TogetherSouvenirStartTime, "YYYY-MM-DD HH:mm:ss"), "second");

  const days = Math.floor(diff / (60 * 60 * 24));
  const hours = Math.floor((diff - days * 60 * 60 * 24) / (60 * 60));
  const minutes = Math.floor((diff - days * 60 * 60 * 24 - hours * 60 * 60) / 60);
  const seconds = diff - days * 60 * 60 * 24 - hours * 60 * 60 - minutes * 60;

  const digitElementClass = "souvenir-time-item__moment__digit";
  document.getElementById(TogetherSouvenirMomentElementId).innerHTML =
    `第<span class="${digitElementClass}">${days}</span>天<span class="${digitElementClass}">${hours}</span>时<span class="${digitElementClass}">${minutes}</span>分<span class="${digitElementClass}">${seconds}</span>秒`;
}

function destroySouvenirUpdateTimer() {
  if (window.SouvenirUpdateTimer != null) {
    clearInterval(window.SouvenirUpdateTimer);
    window.SouvenirUpdateTimer = null;
  }
}

function startSouvenirUpdate() {
  destroySouvenirUpdateTimer();

  updateTogetherSouvenir();
  window.SouvenirUpdateTimer = setInterval(() => {
    updateTogetherSouvenir();
  }, UpdateSouvenirInterval);
}

function startSouvenirMusicPlay() {
  document.getElementById("souvenir_music_player").play();
}

function startSouvenir() {
  document.getElementById("souvenir_mask").classList.remove("show");

  startSouvenirUpdate();
  startSouvenirMusicPlay();
}

window.onload = function () {
  document.getElementById("souvenir_mask")
    .addEventListener("click", function () {
      startSouvenir();
    });
};