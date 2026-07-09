use base64::{engine::general_purpose, Engine as _};
use chrono::Utc;
use reqwest::multipart::{Form, Part};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::env;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Emitter, Manager};
use tokio::fs;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Settings {
    #[serde(default = "default_language")]
    language: String,
    #[serde(default = "default_base_url")]
    base_url: String,
    #[serde(default)]
    api_key: String,
    #[serde(default = "default_config_source")]
    config_source: String,
    #[serde(default = "default_request_format")]
    request_format: String,
    #[serde(default = "default_model")]
    model: String,
    #[serde(default = "default_size")]
    size: String,
    #[serde(default = "default_quality")]
    quality: String,
    #[serde(default = "default_output_format")]
    output_format: String,
    #[serde(default)]
    output_dir: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LocalCodexConfig {
    found: bool,
    api_key: String,
    base_url: String,
    model: String,
    source: String,
    message: String,
}

#[derive(Debug, Clone, Serialize)]
struct GenerationStatus {
    phase: String,
    message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ImageItem {
    id: String,
    prompt: String,
    revised_prompt: Option<String>,
    model: String,
    size: String,
    quality: String,
    output_format: String,
    file_name: String,
    file_path: String,
    created_at: String,
    data_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ReferenceImage {
    name: String,
    mime_type: String,
    data_url: String,
}

#[derive(Debug, Deserialize)]
struct ImageApiResponse {
    data: Vec<ImageApiData>,
}

#[derive(Debug, Deserialize)]
struct ImageApiData {
    b64_json: Option<String>,
    url: Option<String>,
    revised_prompt: Option<String>,
}

struct GeneratedImage {
    bytes: Vec<u8>,
    revised_prompt: Option<String>,
}

fn default_settings() -> Settings {
    Settings {
        language: default_language(),
        base_url: default_base_url(),
        api_key: String::new(),
        config_source: default_config_source(),
        request_format: default_request_format(),
        model: default_model(),
        size: default_size(),
        quality: default_quality(),
        output_format: default_output_format(),
        output_dir: String::new(),
    }
}

fn default_language() -> String {
    "zh".to_string()
}

fn default_config_source() -> String {
    "manual".to_string()
}

fn default_base_url() -> String {
    "https://api.openai.com/v1".to_string()
}

fn default_request_format() -> String {
    "images".to_string()
}

fn default_model() -> String {
    "gpt-image-2".to_string()
}

fn default_size() -> String {
    "1024x1024".to_string()
}

fn default_quality() -> String {
    "auto".to_string()
}

fn default_output_format() -> String {
    "png".to_string()
}

fn app_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Cannot resolve app data directory: {error}"))?;
    std::fs::create_dir_all(&dir).map_err(|error| format!("Cannot create app data directory: {error}"))?;
    Ok(dir)
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_dir(app)?.join("settings.json"))
}

fn gallery_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_dir(app)?.join("gallery.json"))
}

fn default_images_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app_dir(app)?.join("images");
    std::fs::create_dir_all(&dir).map_err(|error| format!("Cannot create image directory: {error}"))?;
    Ok(dir)
}

fn output_dir(app: &AppHandle, settings: &Settings) -> Result<PathBuf, String> {
    let dir = if settings.output_dir.trim().is_empty() {
        default_images_dir(app)?
    } else {
        PathBuf::from(settings.output_dir.trim())
    };
    std::fs::create_dir_all(&dir).map_err(|error| format!("Cannot create output directory: {error}"))?;
    Ok(dir)
}

async fn read_gallery(app: &AppHandle) -> Result<Vec<ImageItem>, String> {
    let path = gallery_path(app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let raw = fs::read_to_string(path)
        .await
        .map_err(|error| format!("Cannot read gallery index: {error}"))?;
    serde_json::from_str(&raw).map_err(|error| format!("Invalid gallery index: {error}"))
}

async fn write_gallery(app: &AppHandle, images: &[ImageItem]) -> Result<(), String> {
    let raw = serde_json::to_string_pretty(images).map_err(|error| format!("Cannot serialize gallery: {error}"))?;
    fs::write(gallery_path(app)?, raw)
        .await
        .map_err(|error| format!("Cannot save gallery index: {error}"))
}

fn content_type(format: &str) -> &'static str {
    match format {
        "jpeg" | "jpg" => "image/jpeg",
        "webp" => "image/webp",
        _ => "image/png",
    }
}

fn image_mime_from_path(path: &Path) -> Result<&'static str, String> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_lowercase();
    match extension.as_str() {
        "png" => Ok("image/png"),
        "jpg" | "jpeg" => Ok("image/jpeg"),
        "webp" => Ok("image/webp"),
        "gif" => Ok("image/gif"),
        _ => Err(format!("Unsupported image file: {}", path.display())),
    }
}

fn clean_base64_payload(value: &str) -> &str {
    value
        .split_once("base64,")
        .map(|(_, payload)| payload)
        .unwrap_or(value)
        .trim()
}

fn decode_image_payload(value: &str) -> Result<Vec<u8>, String> {
    general_purpose::STANDARD
        .decode(clean_base64_payload(value))
        .map_err(|error| format!("Cannot decode image data: {error}"))
}

fn normalize_size(size: &str) -> String {
    let trimmed = size.trim();
    if trimmed.is_empty() {
        default_size()
    } else {
        trimmed.to_string()
    }
}

fn parse_size_pair(size: &str) -> Option<(u32, u32)> {
    let (width, height) = size.trim().split_once('x')?;
    Some((width.trim().parse().ok()?, height.trim().parse().ok()?))
}

fn gcd(mut a: u32, mut b: u32) -> u32 {
    while b != 0 {
        let next = a % b;
        a = b;
        b = next;
    }
    a.max(1)
}

fn aspect_ratio_from_size(size: &str) -> Option<String> {
    let (width, height) = parse_size_pair(size)?;
    let divisor = gcd(width, height);
    Some(format!("{}:{}", width / divisor, height / divisor))
}

fn xai_resolution_from_size(size: &str) -> Result<String, String> {
    let (width, height) = parse_size_pair(size).unwrap_or((1024, 1024));
    let largest = width.max(height);
    if largest <= 1024 {
        Ok("1k".to_string())
    } else if largest <= 2048 {
        Ok("2k".to_string())
    } else {
        Err("xAI Grok Imagine currently supports 1K or 2K only. Select 1K/2K or use OpenAI Images for larger sizes.".to_string())
    }
}

fn normalize_quality(quality: &str) -> String {
    let trimmed = quality.trim();
    if trimmed.is_empty() {
        default_quality()
    } else {
        trimmed.to_string()
    }
}

fn normalize_output_format(format: &str) -> String {
    let value = format.trim().to_lowercase();
    match value.as_str() {
        "jpeg" | "jpg" => "jpeg".to_string(),
        "webp" => "webp".to_string(),
        _ => "png".to_string(),
    }
}

fn normalize_url_input(input: &str) -> String {
    let trimmed = input.trim().trim_end_matches('/').to_string();
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        trimmed
    } else {
        format!("https://{trimmed}")
    }
}

fn endpoint_for_request(base_url: &str, request_format: &str) -> Result<String, String> {
    let url = normalize_url_input(base_url);
    if url.is_empty() || url == "https://" {
        return Err("Base URL is empty".to_string());
    }

    let lower = url.to_lowercase();
    if lower.ends_with("/images/generations") || lower.ends_with("/responses") {
        return Ok(url);
    }

    let base = if lower.ends_with("/v1") {
        url
    } else {
        format!("{url}/v1")
    };
    let path = if request_format == "responses" {
        "responses"
    } else {
        "images/generations"
    };
    Ok(format!("{base}/{path}"))
}

fn endpoint_for_image_edit(base_url: &str) -> Result<String, String> {
    let url = normalize_url_input(base_url);
    if url.is_empty() || url == "https://" {
        return Err("Base URL is empty".to_string());
    }

    let lower = url.to_lowercase();
    if lower.ends_with("/images/edits") {
        return Ok(url);
    }
    if lower.ends_with("/images/generations") {
        return Ok(url.trim_end_matches("/images/generations").to_string() + "/images/edits");
    }
    if lower.ends_with("/responses") {
        return Ok(url.trim_end_matches("/responses").to_string() + "/images/edits");
    }

    let base = if lower.ends_with("/v1") {
        url
    } else {
        format!("{url}/v1")
    };
    Ok(format!("{base}/images/edits"))
}

fn extract_toml_string(raw: &str, keys: &[&str]) -> Option<String> {
    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('#') {
            continue;
        }
        let Some((key, value)) = trimmed.split_once('=') else {
            continue;
        };
        let key = key.trim().trim_matches('"').trim_matches('\'');
        if !keys.iter().any(|candidate| candidate.eq_ignore_ascii_case(key)) {
            continue;
        }
        let value = value.trim().trim_matches('"').trim_matches('\'');
        if !value.is_empty() && value != "null" {
            return Some(value.to_string());
        }
    }
    None
}

fn read_local_codex_config() -> LocalCodexConfig {
    let env_api_key = env::var("OPENAI_API_KEY").ok().filter(|value| !value.trim().is_empty());
    let env_base_url = env::var("OPENAI_BASE_URL")
        .or_else(|_| env::var("OPENAI_API_BASE"))
        .ok()
        .filter(|value| !value.trim().is_empty());
    let env_model = env::var("OPENAI_MODEL").ok().filter(|value| !value.trim().is_empty());

    let mut api_key = env_api_key.unwrap_or_default();
    let mut base_url = env_base_url.unwrap_or_else(default_base_url);
    let mut model = env_model.unwrap_or_else(default_model);
    let mut sources = Vec::new();

    if !api_key.is_empty() {
        sources.push("OPENAI_API_KEY".to_string());
    }
    if base_url != default_base_url() {
        sources.push("OPENAI_BASE_URL/OPENAI_API_BASE".to_string());
    }
    if model != default_model() {
        sources.push("OPENAI_MODEL".to_string());
    }

    if let Some(home) = env::var_os("USERPROFILE").or_else(|| env::var_os("HOME")) {
        let codex_dir = PathBuf::from(home).join(".codex");
        let config_path = codex_dir.join("config.toml");
        if let Ok(raw) = std::fs::read_to_string(&config_path) {
            if api_key.is_empty() {
                if let Some(value) = extract_toml_string(&raw, &["openai_api_key", "api_key", "OPENAI_API_KEY"]) {
                    api_key = value;
                    sources.push(config_path.display().to_string());
                }
            }
            if base_url == default_base_url() {
                if let Some(value) = extract_toml_string(&raw, &["base_url", "api_base", "openai_base_url", "OPENAI_BASE_URL"]) {
                    base_url = value;
                    sources.push(config_path.display().to_string());
                }
            }
            if model == default_model() {
                if let Some(value) = extract_toml_string(&raw, &["model", "openai_model", "OPENAI_MODEL"]) {
                    model = value;
                    sources.push(config_path.display().to_string());
                }
            }
        }

        let auth_path = codex_dir.join("auth.json");
        if api_key.is_empty() {
            if let Ok(raw) = std::fs::read_to_string(&auth_path) {
                if let Ok(value) = serde_json::from_str::<Value>(&raw) {
                    if let Some(key) = value.get("OPENAI_API_KEY").and_then(Value::as_str) {
                        if !key.trim().is_empty() {
                            api_key = key.to_string();
                            sources.push(auth_path.display().to_string());
                        }
                    }
                }
            }
        }
    }

    let found = !api_key.is_empty();
    let message = if found {
        "Local Codex/OpenAI config loaded.".to_string()
    } else {
        "No local OpenAI API key found in environment variables or ~/.codex config.".to_string()
    };

    LocalCodexConfig {
        found,
        api_key,
        base_url,
        model,
        source: if sources.is_empty() {
            "not found".to_string()
        } else {
            sources.join(", ")
        },
        message,
    }
}

fn emit_status(app: &AppHandle, phase: &str, message: &str) {
    let _ = app.emit(
        "generation-status",
        GenerationStatus {
            phase: phase.to_string(),
            message: message.to_string(),
        },
    );
}

fn default_model_for_request_format(request_format: &str) -> String {
    match request_format {
        "responses" => "gpt-5.5".to_string(),
        "xai" => "grok-imagine-image-quality".to_string(),
        _ => default_model(),
    }
}

fn normalize_model_for_request_format(model: &str, request_format: &str) -> String {
    let value = model.trim();
    if value.is_empty() {
        return default_model_for_request_format(request_format);
    }
    if request_format == "xai" && (value == "grok-4.5" || value.starts_with("gpt-")) {
        return default_model_for_request_format(request_format);
    }
    if request_format == "responses" && value.starts_with("gpt-image") {
        return "gpt-5.5".to_string();
    }
    if request_format == "images" && (value == "gpt-5.5" || value == "grok-imagine-image-quality") {
        return default_model();
    }
    value.to_string()
}

fn normalized_settings(settings: &Settings) -> Settings {
    let mut normalized = settings.clone();
    normalized.model = normalize_model_for_request_format(&settings.model, &settings.request_format);
    normalized
}

fn effective_settings(settings: &Settings) -> Result<Settings, String> {
    if settings.config_source != "codex" {
        return Ok(normalized_settings(settings));
    }

    let local = read_local_codex_config();
    if !local.found {
        return Err(format!(
            "{} Switch to Manual input, or set OPENAI_API_KEY before launching this app.",
            local.message
        ));
    }

    let mut merged = settings.clone();
    merged.api_key = local.api_key;
    merged.base_url = local.base_url;
    if settings.model.trim().is_empty() || settings.model == default_model() {
        merged.model = local.model;
    }
    Ok(normalized_settings(&merged))
}

#[tauri::command]
async fn load_settings(app: AppHandle) -> Result<Settings, String> {
    let path = settings_path(&app)?;
    if !path.exists() {
        return Ok(default_settings());
    }
    let raw = fs::read_to_string(path)
        .await
        .map_err(|error| format!("Cannot read local settings: {error}"))?;
    let settings: Settings = serde_json::from_str(&raw).map_err(|error| format!("Invalid local settings: {error}"))?;
    Ok(normalized_settings(&settings))
}

#[tauri::command]
async fn load_local_codex_config() -> Result<LocalCodexConfig, String> {
    Ok(read_local_codex_config())
}

#[tauri::command]
async fn save_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
    let settings = normalized_settings(&settings);
    let raw = serde_json::to_string_pretty(&settings).map_err(|error| format!("Cannot serialize settings: {error}"))?;
    fs::write(settings_path(&app)?, raw)
        .await
        .map_err(|error| format!("Cannot save local settings: {error}"))
}

#[tauri::command]
async fn list_images(app: AppHandle) -> Result<Vec<ImageItem>, String> {
    let mut images = read_gallery(&app).await?;
    images.retain(|image| PathBuf::from(&image.file_path).exists());
    for image in images.iter_mut() {
        let bytes = fs::read(&image.file_path)
            .await
            .map_err(|error| format!("Cannot read image {}: {error}", image.file_name))?;
        image.data_url = format!(
            "data:{};base64,{}",
            content_type(&image.output_format),
            general_purpose::STANDARD.encode(bytes)
        );
    }
    images.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(images)
}

async fn post_json(client: &Client, endpoint: String, api_key: &str, body: Value) -> Result<String, String> {
    let response = client
        .post(endpoint)
        .bearer_auth(api_key.trim())
        .json(&body)
        .send()
        .await
        .map_err(|error| format!("API request failed. Check the Base URL and network connection.\n{error}"))?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|error| format!("Cannot read API response: {error}"))?;
    if !status.is_success() {
        return Err(format_openai_error(status.as_u16(), &text));
    }
    Ok(text)
}

async fn post_multipart(client: &Client, endpoint: String, api_key: &str, form: Form) -> Result<String, String> {
    let response = client
        .post(endpoint)
        .bearer_auth(api_key.trim())
        .multipart(form)
        .send()
        .await
        .map_err(|error| format!("API request failed. Check the Base URL and network connection.\n{error}"))?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|error| format!("Cannot read API response: {error}"))?;
    if !status.is_success() {
        return Err(format_openai_error(status.as_u16(), &text));
    }
    Ok(text)
}

fn format_openai_error(status: u16, body: &str) -> String {
    let Ok(value) = serde_json::from_str::<Value>(body) else {
        return format!("OpenAI API error {status}: {body}");
    };

    let Some(error) = value.get("error") else {
        return format!("OpenAI API error {status}: {body}");
    };

    let message = error
        .get("message")
        .and_then(Value::as_str)
        .unwrap_or("Request failed");
    let error_type = error.get("type").and_then(Value::as_str);
    let param = error.get("param").and_then(Value::as_str);
    let code = error.get("code").and_then(|value| {
        value
            .as_str()
            .map(str::to_string)
            .or_else(|| value.as_i64().map(|number| number.to_string()))
    });

    let hint = match status {
        401 => Some("Invalid or missing API key. Please check the key, then try again."),
        403 => Some("The key is valid but does not have access, or the account/region/model is blocked."),
        404 => Some("Endpoint not found. Check Base URL and request format."),
        429 => Some("Rate limit or quota exceeded. Try later or check account billing/quota."),
        _ => None,
    };

    let mut parts = vec![format!("OpenAI API error {status}: {message}")];
    if let Some(value) = hint {
        parts.push(value.to_string());
    }
    if let Some(value) = error_type {
        parts.push(format!("type={value}"));
    }
    if let Some(value) = param {
        parts.push(format!("param={value}"));
    }
    if let Some(value) = code.as_deref() {
        parts.push(format!("code={value}"));
    }

    parts.join("\n")
}

async fn generate_with_images_api(client: &Client, settings: &Settings, prompt: &str) -> Result<GeneratedImage, String> {
    let endpoint = endpoint_for_request(&settings.base_url, "images")?;
    let model = settings.model.trim();
    let size = normalize_size(&settings.size);
    let quality = normalize_quality(&settings.quality);
    let output_format = normalize_output_format(&settings.output_format);
    let mut body = json!({
        "model": model,
        "prompt": prompt,
        "n": 1,
        "size": size,
        "quality": quality
    });

    if model.starts_with("gpt-image") {
        body["output_format"] = json!(output_format);
    } else {
        body["response_format"] = json!("b64_json");
    }

    let text = post_json(client, endpoint, &settings.api_key, body).await?;
    let parsed: ImageApiResponse =
        serde_json::from_str(&text).map_err(|error| format!("Invalid image API response: {error}; {text}"))?;
    let first = parsed
        .data
        .into_iter()
        .next()
        .ok_or_else(|| "Image API returned no image data".to_string())?;

    let bytes = if let Some(b64) = first.b64_json.as_deref() {
        decode_image_payload(b64)?
    } else if let Some(url) = first.url.as_deref() {
        client
            .get(url)
            .send()
            .await
            .map_err(|error| format!("Cannot download image URL: {error}"))?
            .bytes()
            .await
            .map_err(|error| format!("Cannot read downloaded image: {error}"))?
            .to_vec()
    } else {
        return Err("Image API returned neither b64_json nor url".to_string());
    };

    Ok(GeneratedImage {
        bytes,
        revised_prompt: first.revised_prompt,
    })
}

async fn generate_with_xai_images_api(client: &Client, settings: &Settings, prompt: &str) -> Result<GeneratedImage, String> {
    let endpoint = endpoint_for_request(&settings.base_url, "images")?;
    let size = normalize_size(&settings.size);
    let mut body = json!({
        "model": settings.model.trim(),
        "prompt": prompt,
        "n": 1,
        "response_format": "b64_json",
        "resolution": xai_resolution_from_size(&size)?
    });

    if let Some(aspect_ratio) = aspect_ratio_from_size(&size) {
        body["aspect_ratio"] = json!(aspect_ratio);
    }

    let text = post_json(client, endpoint, &settings.api_key, body).await?;
    let parsed: ImageApiResponse =
        serde_json::from_str(&text).map_err(|error| format!("Invalid xAI image API response: {error}; {text}"))?;
    let first = parsed
        .data
        .into_iter()
        .next()
        .ok_or_else(|| "xAI image API returned no image data".to_string())?;

    let bytes = if let Some(b64) = first.b64_json.as_deref() {
        decode_image_payload(b64)?
    } else if let Some(url) = first.url.as_deref() {
        client
            .get(url)
            .send()
            .await
            .map_err(|error| format!("Cannot download xAI image URL: {error}"))?
            .bytes()
            .await
            .map_err(|error| format!("Cannot read downloaded xAI image: {error}"))?
            .to_vec()
    } else {
        return Err("xAI image API returned neither b64_json nor url".to_string());
    };

    Ok(GeneratedImage {
        bytes,
        revised_prompt: first.revised_prompt,
    })
}

async fn generate_with_image_edits_api(
    client: &Client,
    settings: &Settings,
    prompt: &str,
    reference_images: &[ReferenceImage],
) -> Result<GeneratedImage, String> {
    let endpoint = endpoint_for_image_edit(&settings.base_url)?;
    let mut form = Form::new()
        .text("model", settings.model.trim().to_string())
        .text("prompt", prompt.to_string())
        .text("size", normalize_size(&settings.size))
        .text("quality", normalize_quality(&settings.quality))
        .text("output_format", normalize_output_format(&settings.output_format));

    for image in reference_images {
        let bytes = decode_image_payload(&image.data_url)?;
        if bytes.len() > 50 * 1024 * 1024 {
            return Err(format!("Reference image {} is larger than 50MB.", image.name));
        }
        let part = Part::bytes(bytes)
            .file_name(if image.name.trim().is_empty() {
                "reference.png".to_string()
            } else {
                image.name.clone()
            })
            .mime_str(if image.mime_type.trim().is_empty() {
                "image/png"
            } else {
                image.mime_type.trim()
            })
            .map_err(|error| format!("Invalid reference image MIME type: {error}"))?;
        form = form.part("image[]", part);
    }

    let text = post_multipart(client, endpoint, &settings.api_key, form).await?;
    let parsed: ImageApiResponse =
        serde_json::from_str(&text).map_err(|error| format!("Invalid image edit API response: {error}; {text}"))?;
    let first = parsed
        .data
        .into_iter()
        .next()
        .ok_or_else(|| "Image edit API returned no image data".to_string())?;

    let bytes = if let Some(b64) = first.b64_json.as_deref() {
        decode_image_payload(b64)?
    } else if let Some(url) = first.url.as_deref() {
        client
            .get(url)
            .send()
            .await
            .map_err(|error| format!("Cannot download image URL: {error}"))?
            .bytes()
            .await
            .map_err(|error| format!("Cannot read downloaded image: {error}"))?
            .to_vec()
    } else {
        return Err("Image edit API returned neither b64_json nor url".to_string());
    };

    Ok(GeneratedImage {
        bytes,
        revised_prompt: first.revised_prompt,
    })
}

async fn generate_with_responses_api(client: &Client, settings: &Settings, prompt: &str) -> Result<GeneratedImage, String> {
    let endpoint = endpoint_for_request(&settings.base_url, "responses")?;
    let output_format = normalize_output_format(&settings.output_format);
    let body = json!({
        "model": settings.model.trim(),
        "input": prompt,
        "tools": [{
            "type": "image_generation",
            "size": normalize_size(&settings.size),
            "quality": normalize_quality(&settings.quality),
            "output_format": output_format
        }],
        "tool_choice": { "type": "image_generation" }
    });

    let text = post_json(client, endpoint, &settings.api_key, body).await?;
    let parsed: Value =
        serde_json::from_str(&text).map_err(|error| format!("Invalid responses API response: {error}; {text}"))?;
    let outputs = parsed
        .get("output")
        .and_then(Value::as_array)
        .ok_or_else(|| "Responses API returned no output array".to_string())?;

    for item in outputs {
        if item.get("type").and_then(Value::as_str) != Some("image_generation_call") {
            continue;
        }
        if let Some(result) = item.get("result").and_then(Value::as_str) {
            return Ok(GeneratedImage {
                bytes: decode_image_payload(result)?,
                revised_prompt: item
                    .get("revised_prompt")
                    .and_then(Value::as_str)
                    .map(str::to_string),
            });
        }
    }

    Err("Responses API returned no image_generation_call result".to_string())
}

#[tauri::command]
async fn generate_image(app: AppHandle, prompt: String, reference_images: Option<Vec<ReferenceImage>>) -> Result<ImageItem, String> {
    emit_status(&app, "prepare", "Loading settings...");
    let settings = effective_settings(&load_settings(app.clone()).await?)?;
    let reference_images = reference_images.unwrap_or_default();
    if settings.base_url.trim().is_empty() {
        return Err("Please enter Base URL first".to_string());
    }
    if settings.api_key.trim().is_empty() {
        return Err("Please enter API Key first".to_string());
    }
    if prompt.trim().is_empty() {
        return Err("Please enter a prompt".to_string());
    }
    if reference_images.len() > 8 {
        return Err("Please attach no more than 8 reference images.".to_string());
    }

    let client = Client::new();
    let endpoint = if reference_images.is_empty() {
        endpoint_for_request(&settings.base_url, &settings.request_format)?
    } else {
        endpoint_for_image_edit(&settings.base_url)?
    };
    emit_status(&app, "endpoint", &format!("Using endpoint: {endpoint}"));
    emit_status(&app, "request", if settings.request_format == "xai" { "Sending request to xAI..." } else { "Sending request to OpenAI..." });
    let generated = if !reference_images.is_empty() {
        emit_status(&app, "upload", &format!("Uploading {} reference image(s)...", reference_images.len()));
        generate_with_image_edits_api(&client, &settings, prompt.trim(), &reference_images).await?
    } else if settings.request_format == "xai" {
        generate_with_xai_images_api(&client, &settings, prompt.trim()).await?
    } else if settings.request_format == "responses" {
        generate_with_responses_api(&client, &settings, prompt.trim()).await?
    } else {
        generate_with_images_api(&client, &settings, prompt.trim()).await?
    };
    emit_status(&app, "response", if settings.request_format == "xai" { "xAI returned image data." } else { "OpenAI returned image data." });

    let id = Uuid::new_v4().to_string();
    let format = normalize_output_format(&settings.output_format);
    let file_name = format!("{id}.{format}");
    let file_path = output_dir(&app, &settings)?.join(&file_name);
    emit_status(&app, "save", &format!("Saving image to {}", file_path.display()));
    fs::write(&file_path, &generated.bytes)
        .await
        .map_err(|error| format!("Cannot save image file: {error}"))?;

    let image = ImageItem {
        id,
        prompt: prompt.trim().to_string(),
        revised_prompt: generated.revised_prompt,
        model: settings.model,
        size: normalize_size(&settings.size),
        quality: normalize_quality(&settings.quality),
        output_format: format,
        file_name,
        file_path: file_path.to_string_lossy().to_string(),
        created_at: Utc::now().to_rfc3339(),
        data_url: format!(
            "data:{};base64,{}",
            content_type(&settings.output_format),
            general_purpose::STANDARD.encode(generated.bytes)
        ),
    };

    let mut images = read_gallery(&app).await?;
    images.push(image.clone());
    write_gallery(&app, &images).await?;
    emit_status(&app, "done", "Image saved locally.");
    Ok(image)
}

#[tauri::command]
async fn open_file_location(path: String) -> Result<(), String> {
    let image_path = PathBuf::from(path);
    if !image_path.exists() {
        return Err("Image file does not exist".to_string());
    }
    open_location(&image_path)
}

#[tauri::command]
async fn delete_image(app: AppHandle, id: String) -> Result<(), String> {
    let mut images = read_gallery(&app).await?;
    let Some(index) = images.iter().position(|image| image.id == id) else {
        return Err("Image not found".to_string());
    };
    let image = images.remove(index);
    write_gallery(&app, &images).await?;

    let path = PathBuf::from(image.file_path);
    if path.exists() {
        fs::remove_file(&path)
            .await
            .map_err(|error| format!("Cannot delete image file: {error}"))?;
    }
    Ok(())
}

#[tauri::command]
async fn read_reference_images(paths: Vec<String>) -> Result<Vec<ReferenceImage>, String> {
    let mut images = Vec::new();
    for path in paths {
        let path_buf = PathBuf::from(path);
        if !path_buf.exists() {
            return Err(format!("Reference image does not exist: {}", path_buf.display()));
        }
        let mime_type = image_mime_from_path(&path_buf)?.to_string();
        let bytes = fs::read(&path_buf)
            .await
            .map_err(|error| format!("Cannot read reference image {}: {error}", path_buf.display()))?;
        if bytes.len() > 50 * 1024 * 1024 {
            return Err(format!("Reference image {} is larger than 50MB.", path_buf.display()));
        }
        let name = path_buf
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("reference")
            .to_string();
        images.push(ReferenceImage {
            name,
            mime_type: mime_type.clone(),
            data_url: format!("data:{mime_type};base64,{}", general_purpose::STANDARD.encode(bytes)),
        });
    }
    Ok(images)
}

#[tauri::command]
async fn open_output_dir(app: AppHandle) -> Result<(), String> {
    let settings = load_settings(app.clone()).await?;
    let dir = output_dir(&app, &settings)?;
    open_folder(&dir)
}

#[tauri::command]
async fn get_output_dir(app: AppHandle) -> Result<String, String> {
    let settings = load_settings(app.clone()).await?;
    Ok(output_dir(&app, &settings)?.to_string_lossy().to_string())
}

#[tauri::command]
async fn open_external_url(url: String) -> Result<(), String> {
    if url != "https://zorapi.xyz/" {
        return Err("Unsupported external URL".to_string());
    }
    open_url(&url)
}

#[cfg(target_os = "windows")]
fn open_url(url: &str) -> Result<(), String> {
    Command::new("rundll32")
        .arg("url.dll,FileProtocolHandler")
        .arg(url)
        .spawn()
        .map_err(|error| format!("Cannot open URL: {error}"))?;
    Ok(())
}

#[cfg(target_os = "macos")]
fn open_url(url: &str) -> Result<(), String> {
    Command::new("open")
        .arg(url)
        .spawn()
        .map_err(|error| format!("Cannot open URL: {error}"))?;
    Ok(())
}

#[cfg(all(unix, not(target_os = "macos")))]
fn open_url(url: &str) -> Result<(), String> {
    Command::new("xdg-open")
        .arg(url)
        .spawn()
        .map_err(|error| format!("Cannot open URL: {error}"))?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn open_folder(path: &Path) -> Result<(), String> {
    Command::new("explorer")
        .arg(path)
        .spawn()
        .map_err(|error| format!("Cannot open folder: {error}"))?;
    Ok(())
}

#[cfg(target_os = "macos")]
fn open_folder(path: &Path) -> Result<(), String> {
    Command::new("open")
        .arg(path)
        .spawn()
        .map_err(|error| format!("Cannot open folder: {error}"))?;
    Ok(())
}

#[cfg(all(unix, not(target_os = "macos")))]
fn open_folder(path: &Path) -> Result<(), String> {
    Command::new("xdg-open")
        .arg(path)
        .spawn()
        .map_err(|error| format!("Cannot open folder: {error}"))?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn open_location(path: &Path) -> Result<(), String> {
    Command::new("explorer")
        .arg(format!("/select,{}", path.display()))
        .spawn()
        .map_err(|error| format!("Cannot open file location: {error}"))?;
    Ok(())
}

#[cfg(target_os = "macos")]
fn open_location(path: &Path) -> Result<(), String> {
    Command::new("open")
        .arg("-R")
        .arg(path)
        .spawn()
        .map_err(|error| format!("Cannot open file location: {error}"))?;
    Ok(())
}

#[cfg(all(unix, not(target_os = "macos")))]
fn open_location(path: &Path) -> Result<(), String> {
    let dir = path.parent().ok_or_else(|| "Cannot resolve parent directory".to_string())?;
    Command::new("xdg-open")
        .arg(dir)
        .spawn()
        .map_err(|error| format!("Cannot open file location: {error}"))?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_settings,
            load_local_codex_config,
            save_settings,
            list_images,
            generate_image,
            delete_image,
            read_reference_images,
            open_file_location,
            open_output_dir,
            open_external_url,
            get_output_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
