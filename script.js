// ================================
// 1 & 2. 影片進度綁定 & 碎片重組動畫
// ================================
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, SplitText);

const video = document.getElementById('hero-video');
const loadingText = document.getElementById('loading-text');
const loaderWrapper = document.getElementById('loader-wrapper');

const splitLoaderText = new SplitText(".loader-text", { type: "chars" });
const chars = splitLoaderText.chars;
const logoParts = document.querySelectorAll('.logo-part');

gsap.set(".loader-text", { opacity: 1 });

const loadingTl = gsap.timeline({ paused: true });

// A. Logo 碎片
loadingTl.fromTo(logoParts, 
    { 
        x: () => gsap.utils.random(-400, 400), 
        y: () => gsap.utils.random(-400, 400),
        rotation: () => gsap.utils.random(-180, 180),
        scale: () => gsap.utils.random(0.5, 2.5),
        opacity: 0
    },
    {
        x: 0, y: 0, rotation: 0, scale: 1, opacity: 1,
        stagger: 0.15, duration: 1.5, ease: "back.out(1.2)"
    }, 0
);

// B. 文字飛入
loadingTl.fromTo(chars,
    {
        x: () => gsap.utils.random(-200, 200),
        y: () => gsap.utils.random(-200, 200),
        rotation: () => gsap.utils.random(-90, 90),
        opacity: 0
    },
    {
        x: 0, y: 0, rotation: 0, opacity: 1,
        stagger: 0.03, duration: 1.2, ease: "power3.out"
    }, 0.3
);

// =========================================
// 判斷是否為手機裝置
// =========================================
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth <= 768;

// 智慧分流p結尾 w結尾
const videoFile = isMobile ? './anime/0000p.mp4' : './anime/0000w.mp4';
const posterFile = isMobile ? './img/0000p.webp' : './img/0000w.webp';
const mapFile = isMobile ? './img/0900p.webp' : './img/0900w.webp';

// 立即把影片檔案路徑塞進 HTML 標籤裡
video.src = videoFile;
video.poster = posterFile;

// =========================================
// 核心：依裝置選擇載入策略 & 地圖預載優化
// =========================================
let downloadProgress = 0;
let isMapLoaded = false;
const startTime = Date.now();
const minDuration = isMobile ? 3000 : 6000; 
let isReady = false;

// 監聽 HTML 裡的 img 標籤，不重複下載
const mapImgElement = document.querySelector('.project-bg-image');
if (mapImgElement) {
    mapImgElement.onload = () => { isMapLoaded = true; };
    mapImgElement.onerror = () => { isMapLoaded = true; }; // 防呆
    mapImgElement.src = mapFile; // 派發正確路徑並開始下載
} else {
    isMapLoaded = true; // 防呆放行
}

if (isMobile) {
    // 手機策略：原生串流加載
    video.load(); 

    video.addEventListener('canplaythrough', () => {
        downloadProgress = 1;
    }, { once: true });

    // 手機版防卡死保護
    setTimeout(() => {
        if (downloadProgress < 1) downloadProgress = 1;
    }, 10000);

} else {
    const req = new XMLHttpRequest();
    req.open('GET', videoFile, true); 
    req.responseType = 'blob';

    // 監聽下載進度
    req.onprogress = function(e) {
        if (e.lengthComputable) {
            downloadProgress = e.loaded / e.total; 
        }
    };

    // 下載完成後塞給 video
    req.onload = function() {
        if (this.status === 200) {
            let videoBlob = this.response;
            let vidURL = URL.createObjectURL(videoBlob);
            video.src = vidURL;
            
            video.onloadedmetadata = () => {
                downloadProgress = 1; 
            };
        }
    };
    
    req.send(); // 執行
}

// =========================================
// 視覺進度條與動畫控制
// =========================================
function updateLoadingScreen() {
    if (isReady) return;

    let timeProgress = Math.min((Date.now() - startTime) / minDuration, 1);
    let finalProgress = Math.min(timeProgress, downloadProgress);

    if (!isMapLoaded && finalProgress >= 1) {
        finalProgress = 0.99;
    }

    // 終極防死鎖
    const maxWait = isMobile ? 12000 : 18000;
    if (Date.now() - startTime > maxWait) {
        finalProgress = 1;
        downloadProgress = 1;
        isMapLoaded = true;
    }

    loadingText.innerText = `${Math.floor(finalProgress * 100)}%`;
    gsap.to(loadingTl, { progress: finalProgress, duration: 1, ease: "none", overwrite: "auto" });

    if (finalProgress >= 1 && downloadProgress === 1 && isMapLoaded) {
        isReady = true;
        
        // 🌟 塔塔新增：載入完成的瞬間，背景無縫切換成綠色！
        document.getElementById('loader-wrapper').style.backgroundColor = '#A5570A';
        
        document.getElementById('loader-wrapper').style.pointerEvents = 'none'; 
        document.body.classList.remove('u96'); 
        
        setTimeout(() => {
            if (window.scrollY < 300) {
                gsap.to("#scroll-hint", { opacity: 1, duration: 1, ease: "power2.out" }); 
            }
        }, 300);
        initGSAPAnimation(); 
        
    } else {
        requestAnimationFrame(updateLoadingScreen);
    }
} 

requestAnimationFrame(updateLoadingScreen);

// --- 3. GSAP 時間軸與捲動邏輯 ---
function initGSAPAnimation() {
    video.currentTime = 0;

    const navItems = document.querySelectorAll('.nav-item');
    // 抓取整個地圖
    const mapStage = document.querySelector('.map-markers-wrapper'); 
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    // =========================================
    // 阻尼運鏡：桌機才啟動，手機跳過
    // =========================================
    const desiredState = {
        scale: 1, 
        x: 0, 
        y: 0, 
        isContactMode: false
    };

    if (mapStage && !isMobile) {
        // 桌機：每幀阻尼追蹤 (改對 mapStage 操作)
        const DAMPING = 0.14; 
        gsap.ticker.add(() => {
            const currentScale = gsap.getProperty(mapStage, "scale") || 1;
            const currentX = gsap.getProperty(mapStage, "x") || 0;
            const currentY = gsap.getProperty(mapStage, "y") || 0;

            const compensate = desiredState.scale - 1;
            const targetX = desiredState.x * compensate;
            const targetY = desiredState.y * compensate;

            gsap.set(mapStage, {
                scale: currentScale + (desiredState.scale - currentScale) * DAMPING,
                x: currentX + (targetX - currentX) * DAMPING,
                y: currentY + (targetY - currentY) * DAMPING
            });
        });
    }

    // =========================================
    // 建立主時間軸
    // =========================================
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: ".scroll-container",
            start: "top top",      
            end: "bottom bottom", 
            scrub: 1,  
            onUpdate: () => {
                const currentTime = tl.time(); 
                navItems.forEach(item => item.classList.remove('is-active'));

                if (currentTime >= 36) {
                    document.querySelector('.nav-item[data-label="contact"]')?.classList.add('is-active');
                } else if (currentTime >= 29) {
                    document.querySelector('.nav-item[data-label="project"]')?.classList.add('is-active');
                } else {
                    document.querySelector('.nav-item[data-label="intro"]')?.classList.add('is-active');
                }
            }           
        }
    });

    tl.addLabel("intro", 0);
    tl.addLabel("project", 30); 
    tl.addLabel("projectnav", 31);
    tl.addLabel("contact", 37); 
    tl.addLabel("contactnav", 38); 

    // =========================================
    // 手機選單與導覽跳轉
    // =========================================
    const menuBackdrop = document.getElementById('menu-backdrop'); 

    // 「全體關閉」共用
    function closeMobileMenu() {
        hamburgerBtn.classList.remove('is-open');
        mobileMenu.classList.remove('is-open');
        if (menuBackdrop) menuBackdrop.classList.remove('is-open');
    }

    // 漢堡按鈕點擊事件
    hamburgerBtn.addEventListener('click', () => {
        hamburgerBtn.classList.toggle('is-open');
        mobileMenu.classList.toggle('is-open');
        if (menuBackdrop) menuBackdrop.classList.toggle('is-open'); // 遮罩跟著開關
    });

    // 點擊空白遮罩，直接關閉選單
    if (menuBackdrop) {
        menuBackdrop.addEventListener('click', closeMobileMenu);
    }

    // 點擊導覽列選項後跳轉並關閉
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault(); 
            const target = item.getAttribute('data-label');
            
            if (hamburgerBtn.classList.contains('is-open')) {
                closeMobileMenu();
            }

            if (!tl || !tl.scrollTrigger) return; 

            if (target === 'intro') {
                gsap.to(window, { scrollTo: 0, duration: 1.5, ease: "power2.out" });
            } else if (target === 'project') {
                const scrollPos = tl.scrollTrigger.labelToScroll("projectnav");
                gsap.to(window, { scrollTo: scrollPos, duration: 1.5, ease: "power2.out" });
            } else if (target === 'contact') {
                const scrollPos = tl.scrollTrigger.labelToScroll("contactnav");
                gsap.to(window, { scrollTo: scrollPos, duration: 1.5, ease: "power2.out" });
            }
        });
    });

    // ================
    // 影片與文字動畫
    // ================
    tl.fromTo(video, 
        { currentTime: 0 }, 
        { currentTime: video.duration || 7, ease: "none", duration: 27 }, 
        "intro"
    ); 

    const storyLines = gsap.utils.toArray(".story-content h5");
    const lineDuration = 27 / Math.max(storyLines.length, 1);

    storyLines.forEach((line, index) => {
        const split = new SplitText(line, { type: "chars" });
        gsap.set(split.chars, { opacity: 0.2 }); 
        
        const lineStart = index * lineDuration;
        
        tl.to(line, { opacity: 1, duration: lineDuration * 0.1 }, `intro+=${lineStart}`);
        
        tl.to(split.chars, {
            opacity: 1,
            stagger: { amount: lineDuration * 0.5 },
            ease: "none"
        }, `intro+=${lineStart + lineDuration * 0.1}`);
        
        if (index < storyLines.length - 1) {
            tl.to(line, { opacity: 0, duration: lineDuration * 0.2 }, `intro+=${lineStart + lineDuration * 0.8}`);
        }
    });

    // =========================================
    // 載入畫面退場
    // =========================================
    ScrollTrigger.create({
        trigger: ".scroll-container",
        start: "top top", 
        end: "+=600", 
        scrub: true,  
        once: true,
        animation: gsap.timeline()
            .to("#loader-wrapper", { opacity: 0, duration: 1 }, 0)
            .set("#loader-wrapper", { display: "none" }) 
    });

    // =========================================
    // 提示箭頭
    // =========================================
    ScrollTrigger.create({
        trigger: ".scroll-container",
        start: "top top", 
        end: "+=200",
        onLeave: () => gsap.to("#scroll-hint", { opacity: 0, duration: 0.3, ease: "power2.out" }), 
        onEnterBack: () => gsap.to("#scroll-hint", { opacity: 1, duration: 0.5, ease: "power2.out" }) 
    });

    tl.to(".story-wrapper", { 
        opacity: 0, 
        scale: 2, 
        duration: 2 
    }, "project-=2");

    // rgb 漸層疊加退場（project 段開始前 3 秒淡出）
    tl.to(".ambient-overlay", { opacity: 0, duration: 3 }, "project-=3");

    // =========================================
    // Project 與 Contact 運鏡
    // =========================================
    tl.to(".project-section", { 
        opacity: 1, 
        pointerEvents: "auto", 
        duration: 1,         
        ease: "none",
        
        onStart: () => {
            document.body.classList.add('project-mode'); 
            document.querySelector('.project-section').classList.add('is-visible');
            
            // 把提示詞「彈出」
            if (window.innerWidth >= 769) {
                gsap.to(".cursor-tooltip", { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.5)" });
            }
        },
        onReverseComplete: () => {
            document.body.classList.remove('project-mode');
            document.querySelector('.project-section').classList.remove('is-visible');
            
            // 把提示詞「縮回」
            if (window.innerWidth >= 769) {
                gsap.to(".cursor-tooltip", { scale: 0, opacity: 0, duration: 0.3, ease: "power2.in" });
            }
        }
    }, "project");
    tl.to(".project-title-wrapper", {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power2.out"
    }, "project+=0.2");

    tl.to(".project-title-wrapper", {
        opacity: 0,
        y: -20,
        duration: 0.5,
        ease: "power2.in"
    }, "contact");

    tl.to(".contact-section", { 
        opacity: 1, 
        duration: 2, 
        ease: "power2.out"
    }, "contact")
      .to(".contact-card", { pointerEvents: "auto", duration: 0 }, "contact") 
      .to(".map-marker:not(.contact-company-marker)", {
        opacity: 0,
        pointerEvents: "none",
          x: function(index, marker) {
              const companyMarker = document.querySelector('.contact-company-marker');
              if(!companyMarker) return 0;
              
              const cRect = companyMarker.getBoundingClientRect(); // 公司點的絕對位置
              const mRect = marker.getBoundingClientRect();        // 目前點點的絕對位置
              return cRect.left - mRect.left; 
          },
          y: function(index, marker) {
              const companyMarker = document.querySelector('.contact-company-marker');
              if(!companyMarker) return 0;
              
              const cRect = companyMarker.getBoundingClientRect(); // 公司點的絕對位置
              const mRect = marker.getBoundingClientRect();        // 目前點點的絕對位置
              return cRect.top - mRect.top;
          },
          duration: 1.5,
          ease: "power2.inOut",
          onStart: () => {
              if(!mapStage) return;
              desiredState.isContactMode = true;
              document.body.classList.remove('project-mode');
              if (window.innerWidth >= 769) {
                  gsap.to(".cursor-tooltip", { scale: 0, opacity: 0, duration: 0.3, ease: "power2.in", overwrite: "auto" });
              }

              if (isMobile) {
                  gsap.to(mapStage, { 
                      scale: 2, 
                      transformOrigin: "81% 70%", 
                      duration: 1, 
                      ease: "power2.out" 
                  });
              } else {
                  desiredState.scale = 2; 
                  // 桌機維持原樣
                  desiredState.x = (0.5 - 0.67) * mapStage.offsetWidth; 
                  desiredState.y = (0.5 - 0.84) * mapStage.offsetHeight;
              }
              gsap.to(".contact-company-marker", { opacity: 1, duration: 0.5 });
          },
          onReverseComplete: () => {
              if(!mapStage) return;
              desiredState.isContactMode = false;
              document.body.classList.add('project-mode');
              if (window.innerWidth >= 769) {
                  gsap.to(".cursor-tooltip", { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.5)", overwrite: "auto" });
              }

              if (isMobile) {
                  gsap.to(mapStage, { 
                      scale: 1, 
                      x: 0, 
                      y: 0, 
                      transformOrigin: "83% 70%",
                      duration: 0.8, 
                      ease: "power2.out",
                      onComplete: () => {
                          // 等 0.8 秒完全縮回原狀之後，再偷偷把中心點重置，這樣才不會跳動
                          gsap.set(mapStage, { transformOrigin: "50% 50%" });
                      }
                  });
              } else {
                  desiredState.scale = 1; 
                  desiredState.x = 0;
                  desiredState.y = 0;
              }
              gsap.to(".contact-company-marker", { opacity: 0, duration: 0.5 });
          }
       }, "contact");

    tl.to(".site-footer", {
        y: 0, 
        opacity: 1,
        pointerEvents: "auto",
        duration: 0.8,
        ease: "power2.out"
    }, "contact+=1"); 

    // =========================================
    // 地圖點點 hover 互動（桌機限定）
    // =========================================
    if(mapStage && !isMobile) {
        const mapMarkers = document.querySelectorAll('.map-marker:not(.contact-company-marker)');
        
        mapMarkers.forEach(marker => {
            const style = marker.style;
            const offsetXPercent = (0.5 - parseFloat(style.left) / 100);
            const offsetYPercent = (0.5 - parseFloat(style.top) / 100);

            const dot = marker.querySelector('.pulse-dot');
            if (!dot) return;

            dot.addEventListener('mouseenter', () => {
                if (desiredState.isContactMode || !document.querySelector('.project-section').classList.contains('is-visible')) return;
                
                mapMarkers.forEach(otherMarker => {
                    if (otherMarker !== marker) { 
                        gsap.to(otherMarker, { opacity: 0, duration: 0.3 }); 
                    }
                });

                desiredState.scale = 1.5; 
                desiredState.x = offsetXPercent * mapStage.offsetWidth;
                desiredState.y = offsetYPercent * mapStage.offsetHeight;
            });

            dot.addEventListener('mouseleave', () => {
                if (desiredState.isContactMode) return; 
                
                mapMarkers.forEach(otherMarker => {
                    gsap.to(otherMarker, { opacity: 1, duration: 0.3 }); 
                });

                desiredState.scale = 1;
                desiredState.x = 0;
                desiredState.y = 0;
            });
        });
    }

    // =========================================
    // 情緒時間軸 6 組顏色對應 3 個變數
    // =========================================
    const moodColors = [
        //       c1 (左上)     c2 (中間)     c3 (右下)
        { c1: "#156082", c2: "#A55",c3: "#d4d4d5" },
        { c1: "#924200ff", c2: "#8ca8dbff", c3: "#666" },
        { c1: "#fdd8e2ff", c2: "#53707eff", c3: "#533131ff" }, 
        { c1: "#4e8097ff", c2: "#ffffff", c3: "#869284ff" },
        { c1: "#ffa652ff", c2: "#fff", c3: "#fcb961ff" },
        { c1: "#A55", c2:"#156082",c3: "#d4d4d5" },
    ];

    const moodTl = gsap.timeline({
        scrollTrigger: {
            trigger: ".scroll-container",
            start: "top top",      
            end: "bottom bottom", 
            scrub: 1
        }
    });

    // GSAP 一次改變三個變數
    moodTl.to(":root", { "--mood-c1": moodColors[1].c1, "--mood-c2": moodColors[1].c2, "--mood-c3": moodColors[1].c3, duration: 5 }, 0)
          .to(":root", { "--mood-c1": moodColors[2].c1, "--mood-c2": moodColors[2].c2, "--mood-c3": moodColors[2].c3, duration: 5 }, ">")
          .to(":root", { "--mood-c1": moodColors[3].c1, "--mood-c2": moodColors[3].c2, "--mood-c3": moodColors[3].c3, duration: 5 }, ">")
          .to(":root", { "--mood-c1": moodColors[4].c1, "--mood-c2": moodColors[4].c2, "--mood-c3": moodColors[4].c3, duration: 5 }, ">")
          .to(":root", { "--mood-c1": moodColors[5].c1, "--mood-c2": moodColors[5].c2, "--mood-c3": moodColors[5].c3, duration: 5 }, ">");

} 
// =========================================
// 自訂游標 與 提示詞 (電腦版)
// =========================================
if (!isMobile) {
    // -------------------------------------
    // 1. RGB 色差游標設定
    // -------------------------------------
    const cursorWrapper = document.querySelector('.cursor-wrapper');
    const cursorR = document.querySelector('.cursor-r');
    const cursorG = document.querySelector('.cursor-g');
    const cursorB = document.querySelector('.cursor-b');
    
    gsap.set([cursorR, cursorG, cursorB], { xPercent: -50, yPercent: -50 });

    // quickR → cursorR（最快，0.05s，貼近游標）
    const quickR = {
        x: gsap.quickTo(cursorR, "x", { duration: 0.05, ease: "power3.out" }),
        y: gsap.quickTo(cursorR, "y", { duration: 0.05, ease: "power3.out" })
    };
    // quickG → cursorG（中速，0.15s）
    const quickG = {
        x: gsap.quickTo(cursorG, "x", { duration: 0.15, ease: "power3.out" }),
        y: gsap.quickTo(cursorG, "y", { duration: 0.15, ease: "power3.out" })
    };
    // quickB → cursorB（最慢，0.25s，拖曳最長）
    const quickB = {
        x: gsap.quickTo(cursorB, "x", { duration: 0.25, ease: "power3.out" }),
        y: gsap.quickTo(cursorB, "y", { duration: 0.25, ease: "power3.out" })
    };

    // -------------------------------------
    // 2. 游標提示詞設定
    // -------------------------------------
    const tooltip = document.querySelector('.cursor-tooltip');
    
    gsap.set(tooltip, { xPercent: 0, yPercent: -50, scale: 0, opacity: 0 });

    const tXTo = gsap.quickTo(tooltip, "x", { duration: 0.2, ease: "power3" });
    const tYTo = gsap.quickTo(tooltip, "y", { duration: 0.2, ease: "power3" });

    // -------------------------------------
    // 3. 統一監聽滑鼠移動 
    // -------------------------------------
    window.addEventListener("mousemove", (e) => {
        // 永遠更新 RGB 游標位置
        quickR.x(e.clientX); quickR.y(e.clientY);
        quickG.x(e.clientX); quickG.y(e.clientY);
        quickB.x(e.clientX); quickB.y(e.clientY);

        tXTo(e.clientX);
        tYTo(e.clientY);
    });

    // -------------------------------------
    // 4. 監聽 Hover 狀態 (RGB 游標與提示詞的自動避讓魔法)
    // -------------------------------------
    const hoverElements = document.querySelectorAll('.pulse-dot:not(.company-dot), .nav-item, #hamburger-btn');
    const mapDots = document.querySelectorAll('.pulse-dot:not(.company-dot)');

    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            if (el.classList.contains('pulse-dot') && !document.body.classList.contains('project-mode')) return;
            cursorWrapper.classList.add('is-hovering');
        });
        el.addEventListener('mouseleave', () => {
            cursorWrapper.classList.remove('is-hovering');
        });
    });

    mapDots.forEach(dot => {
        dot.addEventListener('mouseenter', () => {
            if (!document.body.classList.contains('project-mode')) return;
            
            gsap.killTweensOf(tooltip, "scale,opacity");
            gsap.to(tooltip, { scale: 0, opacity: 0, duration: 0.2, ease: "power2.in" });
        });
        
        dot.addEventListener('mouseleave', () => {
            if (document.body.classList.contains('project-mode')) {
                gsap.killTweensOf(tooltip, "scale,opacity");
                gsap.to(tooltip, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.5)" });
            }
        });
    });
}