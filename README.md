# 用九六都市更新有限公司 (96 Urban Regeneration)

這是一個專為「用九六都市更新有限公司」打造的企業官方網站。透過沉浸式的捲動影音體驗與高質感的毛玻璃 UI 設計，傳遞溫柔且專業的都市更新理念。

🔗 **線上瀏覽:** [https://zyzhuarch.github.io/96-Urban-Regeneration/](https://zyzhuarch.github.io/96-Urban-Regeneration/)

## 🛠️ 技術棧 (Tech Stack)
* **前端核心:** HTML5, CSS3, Vanilla JavaScript
* **動畫引擎:** GSAP (ScrollTrigger, ScrollToPlugin, SplitText)
* **視覺設計:** Glassmorphism (毛玻璃特效) + SVG 雜訊濾鏡
* **影音工程:** FFmpeg (針對網頁捲動優化的全關鍵影格 All-Intra 影片壓縮)

## 💡 開發筆記 (Developer Notes)

### 影片轉檔優化指令
為了配合 GSAP `ScrollTrigger` 的無延遲捲動體驗，背景影片必須採用 `-g 1` (H.264) 或密集關鍵影格進行編碼，以確保瀏覽器能在每一幀快速提取畫面。

**AVIF/WebP 序列轉 MP4 指令 (PowerShell + FFmpeg):**
```bash
# 1. 生成圖片絕對路徑清單 (解決容器辨識問題)
(ls images_webp/*.webp | ForEach-Object { "file '$($_.FullName)'" }) | Set-Content list.txt

# 2. 執行高畫質/低延遲縫合 (適用於 60fps 網頁捲動)
ffmpeg -r 60 -f concat -safe 0 -i list.txt -c:v libx264 -preset veryslow -tune stillimage -x264-params "aq-mode=2:ref=16" -g 1 -crf 24 -pix_fmt yuv420p -an final_scroll.mp4
