// MAB Projets — shell desktop Tauri
// Démarre le serveur Express bundlé (sidecar Node.js) sur un port choisi par
// l'OS (PORT=0), lit le port réel dans les logs du serveur, valide /api/health,
// puis ouvre la fenêtre sur http://127.0.0.1:<port>. Tout est asynchrone :
// le setup ne bloque jamais la boucle d'événements.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{Manager, RunEvent};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

struct ServerChild(Mutex<Option<CommandChild>>);

/// Extrait le port de la ligne de log "… serving on port 12345"
fn parse_port(line: &str) -> Option<u16> {
    let idx = line.find("serving on port ")?;
    let rest = &line[idx + "serving on port ".len()..];
    let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
    digits.parse().ok()
}

/// GET /api/health en HTTP brut — valide que c'est bien NOTRE serveur qui répond.
fn health_ok(port: u16) -> bool {
    let addr = format!("127.0.0.1:{port}");
    let Ok(mut stream) =
        TcpStream::connect_timeout(&addr.parse().unwrap(), Duration::from_millis(1000))
    else {
        return false;
    };
    let _ = stream.set_read_timeout(Some(Duration::from_millis(2000)));
    let req = format!("GET /api/health HTTP/1.0\r\nHost: 127.0.0.1:{port}\r\n\r\n");
    if stream.write_all(req.as_bytes()).is_err() {
        return false;
    }
    let mut buf = String::new();
    let _ = stream.read_to_string(&mut buf);
    buf.starts_with("HTTP/1.1 200") || buf.starts_with("HTTP/1.0 200")
}

fn fail_and_exit(app: &tauri::AppHandle, message: &str) {
    eprintln!("[desktop] ERREUR: {message}");
    if let Some(child) = app.state::<ServerChild>().0.lock().unwrap().take() {
        let _ = child.kill();
    }
    app.exit(1);
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(ServerChild(Mutex::new(None)))
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;

            let resource_dir = app.path().resource_dir()?;
            let resources = resource_dir.join("resources");
            let server_js = resources.join("server.cjs");

            // resources/bin (outils optionnels : poppler, tesseract…) en tête du PATH
            let bin_dir = resources.join("bin");
            let sep = if cfg!(windows) { ";" } else { ":" };
            let path_env = format!(
                "{}{}{}",
                bin_dir.to_string_lossy(),
                sep,
                std::env::var("PATH").unwrap_or_default()
            );

            let sidecar = app
                .shell()
                .sidecar("node")?
                .args([server_js.to_string_lossy().to_string()])
                .env("NODE_ENV", "production")
                .env("MAB_DESKTOP", "1")
                .env("MAB_DATA_DIR", data_dir.to_string_lossy().to_string())
                .env("PORT", "0") // port attribué par l'OS — aucune course possible
                .env("PATH", path_env)
                // Les données de langue sont bundlées dans resources/bin/tessdata.
                // Sans cette variable, une installation Tesseract système peut être
                // choisie à la place et la langue française manquer.
                .env(
                    "TESSDATA_PREFIX",
                    bin_dir.join("tessdata").to_string_lossy().to_string(),
                );

            let (mut rx, child) = sidecar.spawn()?;
            *app.state::<ServerChild>().0.lock().unwrap() = Some(child);

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut port: Option<u16> = None;
                let deadline = std::time::Instant::now() + Duration::from_secs(30);

                // 1) Lire les logs du sidecar jusqu'à "serving on port N"
                while port.is_none() && std::time::Instant::now() < deadline {
                    match tokio::time::timeout(Duration::from_secs(1), rx.recv()).await {
                        Ok(Some(CommandEvent::Stdout(line))) => {
                            let text = String::from_utf8_lossy(&line);
                            print!("[server] {text}");
                            port = parse_port(&text);
                        }
                        Ok(Some(CommandEvent::Stderr(line))) => {
                            eprint!("[server] {}", String::from_utf8_lossy(&line));
                        }
                        Ok(Some(CommandEvent::Terminated(status))) => {
                            fail_and_exit(
                                &handle,
                                &format!("le serveur s'est arrêté prématurément ({status:?})"),
                            );
                            return;
                        }
                        Ok(None) => break,
                        _ => {}
                    }
                }

                let Some(port) = port else {
                    fail_and_exit(&handle, "le serveur n'a pas annoncé son port dans les 30 s");
                    return;
                };

                // 2) Valider /api/health (c'est bien notre serveur)
                let mut healthy = false;
                for _ in 0..50 {
                    if tauri::async_runtime::spawn_blocking(move || health_ok(port))
                        .await
                        .unwrap_or(false)
                    {
                        healthy = true;
                        break;
                    }
                    tokio::time::sleep(Duration::from_millis(200)).await;
                }
                if !healthy {
                    fail_and_exit(&handle, "le serveur ne répond pas sur /api/health");
                    return;
                }

                // 3) Ouvrir la fenêtre principale
                let url: tauri::Url = format!("http://127.0.0.1:{port}").parse().unwrap();
                let win = tauri::WebviewWindowBuilder::new(
                    &handle,
                    "main",
                    tauri::WebviewUrl::External(url),
                )
                .title("MAB Projets — APH SELECT")
                .inner_size(1440.0, 900.0)
                .min_inner_size(1024.0, 700.0)
                .build();
                if let Err(e) = win {
                    fail_and_exit(&handle, &format!("impossible d'ouvrir la fenêtre: {e}"));
                    return;
                }

                // 4) Continuer à relayer les logs du serveur
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            print!("[server] {}", String::from_utf8_lossy(&line))
                        }
                        CommandEvent::Stderr(line) => {
                            eprint!("[server] {}", String::from_utf8_lossy(&line))
                        }
                        _ => {}
                    }
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("erreur au démarrage de l'application Tauri")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                // Arrêter proprement le serveur Node au moment de quitter
                if let Some(child) = app.state::<ServerChild>().0.lock().unwrap().take() {
                    let _ = child.kill();
                }
            }
        });
}
