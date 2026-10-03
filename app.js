const audio = document.querySelector("#audio-player");
const fileInput = document.querySelector("#audio-files");
const trackTitle = document.querySelector("#track-title");
const trackArtist = document.querySelector("#track-artist");
const playButton = document.querySelector('[data-player="toggle"]');
const progress = document.querySelector(".progress-bar");
const currentTime = document.querySelector("#current-time");
const duration = document.querySelector("#duration");
const volume = document.querySelector(".volume-bar");
const searchPanel = document.querySelector(".search-panel");
const searchInput = document.querySelector("#music-search");
const playlistContainer = document.querySelector(".library-playlists");
const toast = document.querySelector(".toast");

let tracks = [];
let currentTrack = -1;
let shuffle = false;
let repeat = "off";
let playlists = JSON.parse(localStorage.getItem("spotify-demo-playlists") || "[]");
let activePlaylist = null;
let toastTimeout;

function notify(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove("visible"), 2800);
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainder}`;
}

function setPlayButton(isPlaying) {
    const icon = playButton.querySelector("i");
    icon.className = `fa-solid ${isPlaying ? "fa-pause" : "fa-play"}`;
    playButton.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
}

function renderPlaylists() {
    playlistContainer.replaceChildren();
    playlists.forEach((playlist, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "playlist-entry";
        button.textContent = `${playlist.name} (${playlist.trackNames.length})`;
        button.addEventListener("click", () => {
            activePlaylist = index;
            const nameSet = new Set(playlist.trackNames);
            const queue = tracks.filter((track) => nameSet.has(track.name));
            if (!queue.length) {
                notify("Add songs to this playlist using the + button.");
                return;
            }
            tracks = queue;
            playTrack(0);
        });
        playlistContainer.append(button);
    });
}

function addFiles(files) {
    const audioFiles = Array.from(files).filter((file) => file.type.startsWith("audio/"));
    if (!audioFiles.length) {
        notify("No supported audio files were selected.");
        return;
    }

    const existingNames = new Set(tracks.map((track) => `${track.name}:${track.size}`));
    const added = audioFiles.filter((file) => !existingNames.has(`${file.name}:${file.size}`));
    tracks.push(...added);
    if (activePlaylist !== null) {
        const playlist = playlists[activePlaylist];
        playlist.trackNames.push(...added.map((file) => file.name));
        savePlaylists();
    }
    renderPlaylists();
    renderQueue();
    notify(`${added.length} song${added.length === 1 ? "" : "s"} added to your library.`);
}

function savePlaylists() {
    localStorage.setItem("spotify-demo-playlists", JSON.stringify(playlists));
    renderPlaylists();
}

function renderQueue() {
    let queuePanel = document.querySelector(".queue-panel");
    if (!queuePanel) {
        queuePanel = document.createElement("section");
        queuePanel.className = "queue-panel";
        queuePanel.setAttribute("aria-label", "Your local songs");
        document.querySelector(".main-content").prepend(queuePanel);
    }
    queuePanel.replaceChildren();
    const heading = document.createElement("h2");
    heading.textContent = "Your local songs";
    queuePanel.append(heading);
    if (!tracks.length) {
        const message = document.createElement("p");
        message.textContent = "Add audio files from your device to build your library.";
        queuePanel.append(message);
        return;
    }
    tracks.forEach((track, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "queue-track";
        button.textContent = `${index + 1}. ${track.name.replace(/\.[^.]+$/, "")}`;
        button.addEventListener("click", () => playTrack(index));
        queuePanel.append(button);
    });
}

async function playTrack(index) {
    if (!tracks.length) {
        notify("Add audio files from your device with the + button to play music.");
        fileInput.click();
        return;
    }
    currentTrack = (index + tracks.length) % tracks.length;
    const track = tracks[currentTrack];
    if (audio.src) URL.revokeObjectURL(audio.src);
    audio.src = URL.createObjectURL(track);
    trackTitle.textContent = track.name.replace(/\.[^.]+$/, "");
    trackArtist.textContent = "From your device";
    document.querySelector(".album-image").src = "Daylight music play.jpeg";
    progress.value = 0;
    currentTime.textContent = "0:00";
    duration.textContent = "0:00";
    try {
        await audio.play();
        setPlayButton(true);
    } catch (error) {
        setPlayButton(false);
        notify(`Couldn't play this audio file: ${error.message}`);
    }
}

function nextTrack() {
    if (!tracks.length) return notify("Add local audio to use playback controls.");
    const next = shuffle && tracks.length > 1
        ? (currentTrack + 1 + Math.floor(Math.random() * (tracks.length - 1))) % tracks.length
        : currentTrack + 1;
    playTrack(next);
}

function filterCards(query) {
    const normalized = query.trim().toLocaleLowerCase();
    document.querySelectorAll(".cards-container").forEach((container) => {
        const heading = container.previousElementSibling;
        const headingMatches = heading?.tagName === "H2"
            && heading.textContent.toLocaleLowerCase().includes(normalized);
        let visibleCount = 0;
        container.querySelectorAll(".card").forEach((card) => {
            const matches = !normalized || headingMatches
                || card.textContent.toLocaleLowerCase().includes(normalized);
            card.hidden = !matches;
            if (matches) visibleCount++;
        });
        if (heading?.tagName === "H2") heading.hidden = visibleCount === 0;
    });
}

function openSearch() {
    searchPanel.hidden = false;
    searchInput.focus();
    document.querySelector(".main-content").scrollTop = 0;
}

document.querySelectorAll(".card").forEach((card) => {
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Play ${card.querySelector(".card-title")?.textContent.trim() || "collection"}`);
    const playCard = () => {
        if (!tracks.length) {
            notify("Add local songs with the + button, then choose a collection to play.");
            fileInput.click();
            return;
        }
        const cards = Array.from(document.querySelectorAll(".card"));
        playTrack(cards.indexOf(card) % tracks.length);
    };
    card.addEventListener("click", playCard);
    card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            playCard();
        }
    });
});

document.querySelectorAll("[data-action]").forEach((control) => {
    control.addEventListener("click", () => {
        switch (control.dataset.action) {
            case "add-songs":
                fileInput.click();
                break;
            case "show-library":
            case "queue":
                renderQueue();
                document.querySelector(".queue-panel").scrollIntoView({ behavior: "smooth", block: "start" });
                break;
            case "create-playlist": {
                const name = prompt("Name your playlist:");
                if (!name?.trim()) return;
                playlists.push({ name: name.trim(), trackNames: [] });
                activePlaylist = playlists.length - 1;
                savePlaylists();
                notify(`Playlist “${name.trim()}” created. Add songs with the + button.`);
                break;
            }
            case "browse-podcasts":
                openSearch();
                searchInput.value = "podcast";
                filterCards("podcast");
                break;
            case "clear-search":
                searchInput.value = "";
                filterCards("");
                searchInput.focus();
                break;
            case "mute":
                audio.muted = !audio.muted;
                control.setAttribute("aria-label", audio.muted ? "Unmute" : "Mute");
                control.querySelector("i").className = `fa-solid ${audio.muted ? "fa-volume-xmark" : "fa-volume-low"}`;
                break;
            case "premium":
                notify("Premium sign-up is not available in this local demo.");
                break;
            case "install":
                notify("Install is not configured for this local demo.");
                break;
            case "account":
                notify("This local demo does not use accounts.");
                break;
        }
    });
});

document.querySelectorAll("[data-nav]").forEach((link) => {
    link.addEventListener("click", (event) => {
        event.preventDefault();
        if (link.dataset.nav === "search") {
            openSearch();
        } else {
            searchPanel.hidden = true;
            searchInput.value = "";
            filterCards("");
            document.querySelector(".main-content").scrollTo({ top: 0, behavior: "smooth" });
        }
    });
});

document.querySelectorAll(".sticky-nav-icons img").forEach((icon, index) => {
    icon.tabIndex = 0;
    icon.setAttribute("role", "button");
    icon.setAttribute("aria-label", index === 0 ? "Go back" : "Go forward");
    const move = () => {
        const content = document.querySelector(".main-content");
        content.scrollTo({ top: index === 0 ? 0 : content.scrollHeight, behavior: "smooth" });
    };
    icon.addEventListener("click", move);
    icon.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            move();
        }
    });
});

fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
    fileInput.value = "";
});

document.querySelectorAll("[data-player]").forEach((button) => {
    button.addEventListener("click", () => {
        switch (button.dataset.player) {
            case "toggle":
                if (!audio.src) return playTrack(0);
                if (audio.paused) {
                    audio.play().then(() => setPlayButton(true)).catch((error) => notify(`Playback failed: ${error.message}`));
                } else {
                    audio.pause();
                }
                break;
            case "next":
                nextTrack();
                break;
            case "previous":
                if (audio.currentTime > 3) {
                    audio.currentTime = 0;
                } else {
                    playTrack(currentTrack - 1);
                }
                break;
            case "shuffle":
                shuffle = !shuffle;
                button.classList.toggle("selected", shuffle);
                notify(shuffle ? "Shuffle on" : "Shuffle off");
                break;
            case "repeat":
                repeat = repeat === "off" ? "all" : repeat === "all" ? "one" : "off";
                button.classList.toggle("selected", repeat !== "off");
                button.dataset.mode = repeat;
                notify(`Repeat ${repeat}`);
                break;
        }
    });
});

audio.addEventListener("play", () => setPlayButton(true));
audio.addEventListener("pause", () => setPlayButton(false));
audio.addEventListener("loadedmetadata", () => {
    duration.textContent = formatTime(audio.duration);
});
audio.addEventListener("timeupdate", () => {
    currentTime.textContent = formatTime(audio.currentTime);
    if (Number.isFinite(audio.duration)) progress.value = (audio.currentTime / audio.duration) * 100;
});
audio.addEventListener("ended", () => {
    if (repeat === "one") {
        audio.currentTime = 0;
        audio.play().catch((error) => notify(`Playback failed: ${error.message}`));
    } else if (repeat === "all" || currentTrack < tracks.length - 1) {
        nextTrack();
    } else {
        setPlayButton(false);
    }
});
audio.addEventListener("error", () => {
    if (audio.src) notify("This audio file could not be loaded. Try another file.");
});

progress.addEventListener("input", () => {
    if (Number.isFinite(audio.duration)) audio.currentTime = (Number(progress.value) / 100) * audio.duration;
});
volume.addEventListener("input", () => {
    audio.volume = Number(volume.value) / 100;
    audio.muted = audio.volume === 0;
});
searchInput.addEventListener("input", () => filterCards(searchInput.value));

audio.volume = Number(volume.value) / 100;
renderPlaylists();
