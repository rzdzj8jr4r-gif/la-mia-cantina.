LA MIA CANTINA — versione iniziale

CONTENUTO
- index.html, app.js: applicazione
- manifest.webmanifest, icone: installazione come web app
- sw.js: cache offline della schermata e delle risorse
- Dati e fotografie: IndexedDB locale del browser

COME USARLA
1. Per provarla sul computer, apri index.html in un browser moderno.
2. Per installarla su iPhone e ottenere il comportamento PWA/offline completo, i file devono essere pubblicati su un indirizzo HTTPS.
3. Apri quell'indirizzo in Safari su iPhone > Condividi > Aggiungi alla schermata Home.
4. Apri l'app una prima volta con Internet. Dopo il caricamento iniziale, la struttura dell'app sarà disponibile offline.
5. Esporta regolarmente un backup dalla scheda Backup.

IMPORTANTE
- Questa è una prima versione locale: non c'è sincronizzazione automatica tra dispositivi né riconoscimento automatico dell'etichetta. La foto viene salvata nella scheda del vino, ma i campi si compilano manualmente.
- Le informazioni sono conservate nel browser/dispositivo. Non cancellare i dati di Safari e non rimuovere l'app senza aver prima esportato il backup.
- Per pubblicarla serve un hosting HTTPS. Il pacchetto ZIP contiene tutti i file necessari per il caricamento su un hosting statico.
