"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import { Charm } from "next/font/google";

// Font viết tay lãng mạn CÓ hỗ trợ đầy đủ dấu tiếng Việt.
// (Dancing Script KHÔNG có bộ dấu tiếng Việt đầy đủ — đó là nguyên nhân
// gây mất dấu/lỗi hiển thị chữ trước đây.)
const charm = Charm({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "700"],
  display: "swap",
  fallback: ["Be Vietnam Pro", "Segoe UI", "system-ui", "sans-serif"],
});

const LETTER_PASSWORD = "2809269";
const PIN_LENGTH = LETTER_PASSWORD.length;
const EMPTY_PIN = Array<string>(PIN_LENGTH).fill("");

// Các mốc thời gian phải khớp với keyframes trong <style> bên dưới.
const PAPER_FADE_IN_AT = 1150; // tờ thư phóng to dần ra toàn màn hình
const OPENING_DURATION = 1700; // lúc hoạt ảnh mở phong bì kết thúc

// Chỉ bung hoa ở lần mở thư đầu tiên (nhớ trong localStorage của máy).
const FLOWERS_STORAGE_KEY = "guichobong-flowers-shown";
const FLOWER_EMOJIS = ["🌸", "🌷", "🌺", "💐", "🌹", "🏵️", "💮", "🌼"];
const FLOWER_COUNT = 28;
const FLOWER_DURATION = 2600;

// 3 ảnh trong /public, mỗi bên 3 tấm, trôi chậm hơn chữ để tạo chiều sâu.
// Ảnh nằm hẳn ngoài cột chữ nên không che nội dung.
const SIDE_PHOTOS = [
  { src: "/img1.jpg", side: "left", top: "3%", speed: -0.1, rotate: -6 },
  { src: "/img2.jpg", side: "right", top: "15%", speed: 0.13, rotate: 5 },
  { src: "/img3.jpg", side: "left", top: "33%", speed: -0.15, rotate: 4 },
  { src: "/img1.jpg", side: "right", top: "47%", speed: 0.09, rotate: -5 },
  { src: "/img2.jpg", side: "left", top: "64%", speed: -0.12, rotate: 6 },
  { src: "/img3.jpg", side: "right", top: "79%", speed: 0.14, rotate: -4 },
] as const;

type Phase = "closed" | "asking" | "opening" | "open";

export default function LetterPage() {
  const [phase, setPhase] = useState<Phase>("closed");
  // Chỉ hỏi mật khẩu ở lần mở đầu tiên; sau đó đóng/mở lại không cần nhập nữa.
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isPaperVisible, setIsPaperVisible] = useState(false);
  const [digits, setDigits] = useState<string[]>(EMPTY_PIN);
  const [showPin, setShowPin] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [error, setError] = useState("");
  const [showFlowers, setShowFlowers] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const flowerTimerRef = useRef<number | undefined>(undefined);

  // Toạ độ hoa tính theo công thức (không dùng Math.random) để server và
  // client luôn dựng ra cùng một kết quả.
  const flowers = useMemo(
    () =>
      Array.from({ length: FLOWER_COUNT }, (_, index) => {
        const angle = ((index * 137.508) * Math.PI) / 180; // góc vàng: toả đều
        const distance = 120 + ((index * 53) % 11) * 26;
        return {
          emoji: FLOWER_EMOJIS[index % FLOWER_EMOJIS.length],
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          size: 18 + ((index * 31) % 5) * 9,
          delay: ((index * 17) % 7) * 0.045,
          spin: (index % 2 === 0 ? 1 : -1) * (140 + ((index * 41) % 5) * 60),
          duration: 1.5 + ((index * 13) % 5) * 0.16,
        };
      }),
    [],
  );

  const pin = digits.join("");
  const isPinComplete = pin.length === PIN_LENGTH;
  const isLetterStarted = phase === "opening" || phase === "open";

  // Chạy hoạt ảnh mở phong bì, rồi mới hiện tờ thư toàn màn hình.
  useEffect(() => {
    if (phase !== "opening") return;

    // Ai bật "giảm chuyển động" thì vào thẳng tờ thư, không chờ hoạt ảnh.
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const fadeTimer = window.setTimeout(
      () => setIsPaperVisible(true),
      reduceMotion ? 0 : PAPER_FADE_IN_AT,
    );
    const endTimer = window.setTimeout(
      () => setPhase("open"),
      reduceMotion ? 0 : OPENING_DURATION,
    );
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(endTimer);
    };
  }, [phase]);

  // Ảnh hai bên trôi chậm hơn chữ. Đọc scrollTop rồi đẩy vào biến CSS
  // --scroll, nên chỉ chạy transform (không layout lại) -> mượt.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (phase !== "open" || !scroller) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const syncParallax = () => {
      frame = 0;
      parallaxRef.current?.style.setProperty(
        "--scroll",
        String(scroller.scrollTop),
      );
    };
    const handleScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(syncParallax);
    };

    syncParallax();
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [phase]);

  // Dọn hẹn giờ của màn bung hoa khi rời trang.
  useEffect(
    () => () => {
      if (flowerTimerRef.current) window.clearTimeout(flowerTimerRef.current);
    },
    [],
  );

  // Con trỏ nhảy vào ô số đầu tiên ngay khi pop-up hiện ra.
  useEffect(() => {
    if (phase === "asking") inputsRef.current[0]?.focus();
  }, [phase]);

  const resetPin = () => {
    setDigits(EMPTY_PIN);
    setShowPin(false);
    setIsShaking(false);
    setError("");
  };

  const focusInput = (index: number) => {
    const input = inputsRef.current[index];
    if (!input) return;
    input.focus();
    input.select();
  };

  // play() phải nằm trong cùng một hành động của người dùng (gõ số / bấm nút),
  // nếu không trình duyệt sẽ chặn nhạc tự động.
  const burstFlowersOnce = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShowFlowers(true);
    flowerTimerRef.current = window.setTimeout(
      () => setShowFlowers(false),
      FLOWER_DURATION,
    );
  };

  const startOpening = () => {
    setPhase("opening");
    burstFlowersOnce();
    audioRef.current
      ?.play()
      .catch((err) => console.log("Lỗi phát nhạc:", err));
  };

  const closeLetter = () => {
    setPhase("closed");
    setIsPaperVisible(false);
    audioRef.current?.pause();
  };

  const handleEnvelopeClick = () => {
    if (phase !== "closed") return;
    if (isUnlocked) {
      startOpening();
      return;
    }
    resetPin();
    setPhase("asking");
  };

  const handleCancelPin = () => {
    setPhase("closed");
    resetPin();
  };

  const checkPin = (value: string) => {
    if (value !== LETTER_PASSWORD) {
      setError("Mật khẩu chưa đúng rồi, thử lại nha 🥺");
      setDigits(EMPTY_PIN);
      setIsShaking(true);
      focusInput(0);
      return;
    }
    setIsUnlocked(true);
    resetPin();
    startOpening();
  };

  const handleDigitChange = (index: number, value: string) => {
    const typed = value.replace(/\D/g, "");
    const next = [...digits];

    if (!typed) {
      // Người dùng vừa xoá ô này.
      next[index] = "";
      setDigits(next);
      return;
    }

    // Gõ (hoặc dán) nhiều số thì điền lần lượt từ ô đang đứng.
    for (let i = 0; i < typed.length && index + i < PIN_LENGTH; i += 1) {
      next[index + i] = typed[i];
    }
    setDigits(next);
    if (error) setError("");

    if (next.join("").length === PIN_LENGTH) {
      checkPin(next.join("")); // đủ 6 số là tự kiểm tra luôn
    } else {
      focusInput(Math.min(index + typed.length, PIN_LENGTH - 1));
    }
  };

  const handleDigitKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Escape") {
      handleCancelPin();
      return;
    }
    if (event.key === "Backspace") {
      if (digits[index]) return; // ô đang có số: để onChange tự xoá
      event.preventDefault();
      if (index === 0) return;
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      focusInput(index - 1);
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
    }
    if (event.key === "ArrowRight" && index < PIN_LENGTH - 1) {
      event.preventDefault();
      focusInput(index + 1);
    }
  };

  const handleDigitPaste = (
    index: number,
    event: ClipboardEvent<HTMLInputElement>,
  ) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    event.preventDefault();
    handleDigitChange(index, pasted);
  };

  const handleSubmitPin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPinComplete) checkPin(pin);
  };

  return (
    <div
      className={`relative h-[100dvh] w-screen overflow-hidden font-sans select-none ${charm.className}`}
    >
      {/* Dòng kẻ giấy khớp CHÍNH XÁC với line-height của chữ ở từng breakpoint,
          nên chữ luôn nằm gọn trên từng dòng kẻ, không bị đè/dính lên nhau. */}
      <style>{`
        .ruled-paper {
          line-height: 2rem; /* 32px */
          background-image: repeating-linear-gradient(
            transparent, transparent 1.875rem,
            #e8e2d8 1.875rem, #e8e2d8 2rem
          );
        }
        @media (min-width: 768px) {
          .ruled-paper {
            line-height: 2.5rem; /* 40px */
            background-image: repeating-linear-gradient(
              transparent, transparent 2.375rem,
              #e8e2d8 2.375rem, #e8e2d8 2.5rem
            );
          }
        }

        /* ===== Hoạt ảnh mở phong bì ===== */
        .envelope-stage { perspective: 1400px; }
        .envelope-flap {
          transform-origin: top center;
          transform-style: preserve-3d;
        }
        @keyframes flap-open {
          0%   { transform: rotateX(0deg); z-index: 30; }
          49%  { z-index: 30; }
          50%  { z-index: 5; }
          100% { transform: rotateX(-172deg); z-index: 5; }
        }
        @keyframes letter-rise {
          0%   { transform: translateY(10%) scale(0.97); }
          100% { transform: translateY(-46%) scale(1.02); }
        }
        @keyframes envelope-away {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.12) translateY(4%); }
        }
        @keyframes soft-out { to { opacity: 0; } }
        .opening .envelope-flap {
          animation: flap-open 0.65s ease-in-out forwards;
        }
        .opening .envelope-letter {
          animation: letter-rise 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.5s forwards;
        }
        .opening .envelope-body {
          animation: envelope-away 0.6s ease-in 1.1s forwards;
        }
        .opening .envelope-seal {
          animation: soft-out 0.3s ease forwards;
        }

        /* ===== Pop-up nhập mã PIN ===== */
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pop-in {
          from { opacity: 0; transform: translateY(14px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pin-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-9px); }
          40% { transform: translateX(9px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        .pin-backdrop { animation: fade-in 0.25s ease forwards; }
        .pin-card { animation: pop-in 0.32s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .pin-shake { animation: pin-shake 0.45s ease-in-out; }

        /* ===== Bung hoa ở lần mở thư đầu tiên ===== */
        @keyframes flower-burst {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.2) rotate(0deg);
          }
          12% { opacity: 1; }
          60% {
            opacity: 1;
            transform: translate(calc(-50% + var(--fx)), calc(-50% + var(--fy)))
              scale(1.1) rotate(calc(var(--spin) * 0.7));
          }
          100% {
            opacity: 0;
            transform: translate(
                calc(-50% + var(--fx) * 1.15),
                calc(-50% + var(--fy) + 110px)
              )
              scale(0.85) rotate(var(--spin));
          }
        }
        .flower {
          animation-name: flower-burst;
          animation-timing-function: cubic-bezier(0.18, 0.9, 0.32, 1);
          animation-fill-mode: forwards;
        }

        /* ===== Ảnh hai bên trôi theo kiểu parallax ===== */
        .side-photo {
          transform: translateY(calc(var(--scroll, 0) * var(--speed) * 1px))
            rotate(var(--tilt));
          will-change: transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .opening .envelope-flap,
          .opening .envelope-letter,
          .opening .envelope-body,
          .opening .envelope-seal,
          .envelope-seal,
          .pin-backdrop,
          .pin-card,
          .flower,
          .pin-shake {
            animation-duration: 0.01ms !important;
            animation-delay: 0ms !important;
            animation-iteration-count: 1 !important;
          }
          .side-photo {
            transform: rotate(var(--tilt));
          }
        }
      `}</style>

      {/* File nhạc nền */}
      <audio ref={audioRef} src="/onlyyou.mp3" loop />

      {/* Ảnh nền — mờ dần và trôi nhẹ ra sau khi thư được mở */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat filter brightness-90 contrast-100 transition-all ease-in-out"
        style={{
          backgroundImage: "url('/chungminh.jpg')",
          transitionDuration: "1200ms",
          opacity: isLetterStarted ? 0.3 : 1,
          transform: isLetterStarted ? "scale(1.08)" : "scale(1)",
        }}
      />
      <div className="absolute inset-0 bg-black/25" />
      {/* Lớp giấy kem phủ dần lên nền, nhường chỗ cho tờ thư */}
      <div
        className="absolute inset-0 bg-[#fdfbf7] transition-opacity ease-in-out"
        style={{
          transitionDuration: "1200ms",
          opacity: isLetterStarted ? 0.72 : 0,
        }}
      />

      {/* ===== PHONG BÌ: đứng yên khi đóng, bật nắp + đẩy thư lên khi mở ===== */}
      <div
        className={`envelope-stage absolute inset-0 flex items-center justify-center p-4 transition-opacity duration-500 ease-in-out ${
          phase === "opening" ? "opening" : ""
        }`}
        style={{
          opacity: phase === "open" ? 0 : 1,
          pointerEvents: phase === "closed" ? "auto" : "none",
        }}
      >
        <div
          onClick={handleEnvelopeClick}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleEnvelopeClick();
            }
          }}
          role="button"
          tabIndex={phase === "closed" ? 0 : -1}
          aria-label="Mở thư"
          className="relative cursor-pointer transition-transform duration-300 hover:scale-105"
          style={{
            width: "clamp(240px, 58vw, 400px)",
            height: "clamp(220px, 36dvh, 300px)",
          }}
        >
          <div className="envelope-body relative w-full h-full">
            {/* Tờ thư nằm trong phong bì — trượt lên khi nắp đã bật */}
            <div className="envelope-letter absolute left-[7%] right-[7%] top-[10%] bottom-[16%] z-10 rounded-lg bg-[#fdfbf7] border border-rose-100 shadow-xl overflow-hidden p-4 md:p-5">
              <div className="h-2 w-1/2 rounded-full bg-rose-300/70" />
              <div className="mt-3 space-y-2">
                <div className="h-1.5 w-full rounded-full bg-rose-100" />
                <div className="h-1.5 w-11/12 rounded-full bg-rose-100" />
                <div className="h-1.5 w-full rounded-full bg-rose-100" />
                <div className="h-1.5 w-9/12 rounded-full bg-rose-100" />
              </div>
              <div className="absolute bottom-2 right-3 text-base md:text-lg text-rose-300">
                💗
              </div>
            </div>

            {/* Lòng phong bì (mặt sau) */}
            <div className="absolute inset-0 z-0 bg-rose-100/95 rounded-b-2xl shadow-2xl border-x border-b border-rose-200/60" />

            {/* Mặt trước phong bì — che phần dưới tờ thư khi nó trượt lên */}
            <div
              className="absolute inset-0 z-20 bg-rose-200/95 rounded-b-2xl border-x border-b border-rose-300/50"
              style={{
                clipPath: "polygon(0 34%, 50% 76%, 100% 34%, 100% 100%, 0 100%)",
              }}
            />

            {/* Nắp phong bì — bật ngửa ra sau khi nhập đúng mã */}
            <div
              className="envelope-flap absolute top-0 left-0 w-full z-30 bg-rose-300"
              style={{
                height: "clamp(90px, 20vh, 220px)",
                clipPath: "polygon(0 0, 50% 68%, 100% 0)",
              }}
            />

            {/* Niêm phong */}
            <div className="envelope-seal absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-white/90 p-2.5 md:p-3.5 rounded-full shadow-lg border border-rose-200 animate-bounce text-lg md:text-2xl">
              💌
            </div>
          </div>

          <div
            className="absolute -bottom-8 left-0 right-0 text-center text-white/95 text-xs md:text-sm font-medium drop-shadow-md transition-opacity duration-300"
            style={{ opacity: phase === "closed" ? 1 : 0 }}
          >
            {isUnlocked
              ? "Chạm vào phong bì để mở thư ✨"
              : "Chạm vào phong bì và nhập mã để mở thư 🔒"}
          </div>
        </div>
      </div>

      {/* ===== TRẠNG THÁI MỞ: tờ thư phủ kín toàn màn hình, cuộn để đọc ===== */}
      <div
        className="fixed inset-0 z-40 transition-all duration-700 ease-out"
        style={{
          opacity: isPaperVisible ? 1 : 0,
          transform: isPaperVisible ? "scale(1)" : "scale(0.92)",
          pointerEvents: phase === "open" ? "auto" : "none",
        }}
      >
        <div
          ref={scrollRef}
          className="ruled-paper h-[100dvh] w-screen overflow-y-auto bg-[#fdfbf7]"
          style={{
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
            paddingTop: "max(env(safe-area-inset-top), 1.5rem)",
            paddingBottom: "max(env(safe-area-inset-bottom), 2.5rem)",
            paddingLeft:
              "max(env(safe-area-inset-left), clamp(1.25rem, 6vw, 4rem))",
            paddingRight:
              "max(env(safe-area-inset-right), clamp(1.25rem, 6vw, 4rem))",
          }}
        >
          {/* Nút đóng thư */}
          <button
            onClick={closeLetter}
            aria-label="Đóng thư"
            className="fixed z-50 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/90 shadow-lg border border-rose-200 flex items-center justify-center text-rose-500 text-xl hover:bg-white transition-colors"
            style={{
              top: "max(env(safe-area-inset-top), 1rem)",
              right: "max(env(safe-area-inset-right), 1rem)",
            }}
          >
            ✕
          </button>

          {/* Tem thư trang trí */}
          <div className="absolute top-4 right-16 w-10 h-12 md:w-14 md:h-16 bg-rose-50 border-2 border-dashed border-rose-300 rounded-lg flex items-center justify-center text-sm md:text-base text-rose-400 rotate-6 shadow-sm">
            🌸
          </div>

          {/* Nội dung thư - rộng dễ đọc, tự động xuống dòng, khớp dòng kẻ, viết dài bao nhiêu cũng cuộn được */}
          <div className="relative max-w-2xl mx-auto text-gray-800 space-y-4">
            {/* Ảnh kỷ niệm nằm hẳn ngoài cột chữ (chỉ hiện từ xl trở lên,
                khi hai bên đủ rộng) nên không bao giờ che nội dung thư. */}
            <div
              ref={parallaxRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 hidden select-none xl:block"
            >
              {SIDE_PHOTOS.map((photo, index) => {
                const photoStyle: CSSProperties & Record<string, string> = {
                  top: photo.top,
                  "--speed": String(photo.speed),
                  "--tilt": `${photo.rotate}deg`,
                };
                return (
                  <div
                    key={`${photo.src}-${index}`}
                    className={`side-photo absolute w-[150px] 2xl:w-[180px] rounded-sm bg-white p-2 pb-6 shadow-[0_10px_30px_rgba(0,0,0,0.14)] ${
                      photo.side === "left"
                        ? "right-full mr-8 2xl:mr-14"
                        : "left-full ml-8 2xl:ml-14"
                    }`}
                    style={photoStyle}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-rose-50">
                      <Image
                        src={photo.src}
                        alt=""
                        fill
                        sizes="180px"
                        className="object-cover"
                      />
                    </div>
                    <span className="absolute bottom-1 right-2.5 text-sm text-rose-300">
                      {index % 2 === 0 ? "💗" : "🌸"}
                    </span>
                  </div>
                );
              })}
            </div>

            <h2
              className="font-bold text-rose-600"
              style={{ fontSize: "clamp(1.75rem, 5vw, 3rem)" }}
            >
              Gửi Bông thúi,anh tự làm đó khi nào buồn thì có thể mang ra đọc
              lại những lời cuối!! ✨
            </h2>

            <p className="text-gray-800 font-medium whitespace-pre-wrap break-words text-lg md:text-2xl">
              Thật buồn khi lại phải viết những dòng này.Haizz nhiều lần quá mà
              giờ chả biết viết như này tiếp liệu nó có giá trị không và không
              biết e có đọc nó nghiêm túc nữa không,hi vọng là e sẽ đọc.Nhưng
              thật sự là a viết những lời này để níu kéo chỉ là a muốn e biết
              rằng a đã quay lại và hi vọng tình yêu 1 cách tử tế nhất và tìm
              lại phiên bản của chính mình ngày đó.Em có biết mình của thời điểm
              bây giờ khác với thời điểm ngày xưa là gì không.Đó là ở thời điểm
              xưa đích đến của chúng ta là cưới nhau và a chỉ muốn e là người
              cuối cùng mà a yêu,tình yêu đơn giản không nghĩ gì về tương
              lai,nhưng bây giờ có lẽ là lúc mình trưởng thành hơn mình không
              chỉ đơn giản nghĩ về tình yêu nữa mà còn lo lắng cho tương lai sự
              nghiệp.Sau 3 ngày không nhắn tin,a đã cho bản thân a thời gian suy
              nghĩ thật thấu đáo để nói ra những điều này.Anh đã thực sự hi vọng
              ngày mình quay lại bắt đầu với 1 mối quan hệ nghiêm túc a muốn tập
              trung vào chỉ 1 người,yêu 1 người mà người đó sẽ luôn cùng chung
              hướng đi ủng hộ mình mọi thứ và cho mình cảm giác mình là duy
              nhất(giống mình của ngày xưa ý)anh đã cố gắng đi tìm lại phiên bản
              đó của mình nhưng có lẽ e của phiên bản đó đã thực sự biến mất
              rồi.Anh rất ghét việc phải chặn e cũng như a nói là a thấy cái
              việc đó nó rất là trẻ trâu ý,thật lòng a k muốn biến e thành người
              xa lạ đâu nhưng ở lúc đó a đã rất tổn thương và a k muốn thấy
              những lời nói đó nữa và nếu k chặn thì a sẽ lại yếu lòng mình lại
              lặp lại vòng lặp đó thật là tốn thời gian của nhau.3 ngày qua a
              không soi e hay cố biết e làm bất kể thứ gì vì a không muốn thấy
              những thứ đã hình thành lên nỗi sợ của a,a đã phải cố làm bản thân
              a thật bận rộn để không nghĩ tới e ý.Cũng xin lỗi e nhiều khi a
              lại chửi bậy a cũng chỉ biết chẹp chẹp “Mình lại thế rồi” nhưng
              lúc đó là a vùng vẫy không chấp nhận cái phiên bản ngày xưa của em
              đi mất rồi đó.Em có biết là e của ngày xưa khi a gặp biến cố hay
              chuyện gì đen đủi e sẽ như nào không?Em sẽ đến xong ôm anh rồi e
              bảo: “Huhuhu em thương anh lắm ý”,e luôn lẽo đẽo theo sau dù a có
              làm cái gì.Mỗi lần như thế a chỉ muốn ôm e thật chặt th.Hay cả lúc
              a vẫn nhớ mãi là mình cãi nhau a im lặng xong em ra tận Hòa Lạc và
              ngồi khóc,lúc đấy a kiểu nhìn mà đau lòng luôn “UI Bông của
              mình,mình đã làm cái gì vậy”thề chỉ muốn ôm thật chặt và hứa là
              không bao giờ cãi nhau nữa thôi.
            </p>

            <p className="text-gray-800 font-medium whitespace-pre-wrap break-words text-lg md:text-2xl">
              Cũng tiếc vì khoảng thời gian đó a luôn cố tỏ ra lạnh lùng nhưng
              thật lòng thì a đã rất hạnh phúc khoảng thời gian đó và yêu e
              nhiều lắm.Nhưng a cũng đã nói cho lí do của a là có nỗi đau và nỗi
              sợ thực chất thì e sẽ k hiểu được haizzzz chắc là e cũng có nỗi
              đau riêng th nhưng a nghĩ là nó hong bằng a.Giờ mối quan hệ xung
              quanh của e thật là nhiều người là con zai a khá mệt mỏi khoản đó
              đúng là khác với ngày xưa thiệt vì a luôn có thể bị đá mà cũng
              ngay cả có yêu lại mình cũng chẳng thể đi ăn đi chơi với nhau 1
              cách tự nhiên.Anh và em thật khác nhau,tiếc thật sao e lại xóa hết
              kỉ niệm vậy!!,tất cả mọi thứ mình có với nhau a luôn giữ a chẳng
              xóa 1 cái gì ngay cả tin nhắn lần đầu mình quen nhau,anh không
              muốn xóa ngay cả giây phút này vì a nhớ a sẽ mở ra đọc.Không phải
              vì lụy...chỉ là a sợ rằng a quên mất ngày xưa mình hạnh phúc như
              nào,anh yêu em như nào tình cảm lớn ra sao.Anh không muốn quên mất
              phiên bản mà mình từng rất yêu nhau đó cũng là lí do rất lớn để a
              quyết định nói ra những dòng này.Và anh chọn dừng lại để bảo vệ
              cho tình yêu và kỉ niệm đó,cũng như bảo vệ phiên bản tuyệt vời đó
              của e trong mắt a,có thể nói hơi phiến diện nhưng a dạo này hay
              nói e khác xưa quá thật ra a chẳng chấp nhận thực tại ấy đâu nhưng
              a nghĩ là “oke chắc là tại lâu mình không gặp,chỉ cần gặp lại là
              sẽ quay trở lại phiên bản ngày xưa đó”nhưng thực tế thật là
              khác.Những cách cư xử những cách hoạt động thật là khác vì a nhớ e
              của ngày xưa yêu thương và quan tâm a nhiều như nào nên giờ phút
              này a muốn dừng lại để không phải thấy phiên bản “Bông của anh”
              ngày hành xử càng khác.Có lẽ e cũng chẳng nhớ ngày xưa mình hạnh
              phúc như nào,e yêu a ra sao chắc tại e xóa hết cái kỉ niệm đó đi
              nên con người của phiên bản đó cũng đi luôn rồi!!!Cái ngày gặp gần
              nhất,thậm chí a còn không muốn kiểm tra hay làm gì máy điện thoại
              cả vì a muốn bảo vệ hình ảnh Bông trong mắt a.Anh chưa bao giờ hi
              vọng là người bước tiếp của mình trong tương lai không phải e cả,a
              luôn muốn người đấy là em ý nên a chưa bao giờ mở lòng với ai cả
              vì a sợ rằng e sẽ quay lại,đúng hơn là a luôn đợi e quay lại,nhưng
              e cũng mở lòng r mà e còn cho người ta cảm giác lụy và chưa gặp
              được ai vui như e.Chắc cũng là lí do phiên bản này e khá phớt lờ a
              khi mình cãi nhau.Giờ thì a hiểu cảm giác ngày xưa của e rồi.
            </p>

            <p className="text-gray-800 font-medium whitespace-pre-wrap break-words text-lg md:text-2xl">
              Khi cãi nhau cứ im lặng xong lại làm đối phương nghi ngờ tình cảm
              của mình.Nhưng lúc đó a rất yêu e a luôn đợi chờ tin nhắn ý.Giờ
              thì chắc e phiên bản khác hì.Đừng nghĩ linh tinh nha vì a muốn
              viết là để kết thúc chứ không phải quay lại.Hmmm còn chuyện tương
              lai của cả 2,nói thật thì là định hướng thật khác nhau đó là lí do
              a muốn ta nói chuyện nghiêm túc 1 buổi về vấn đề đó nhưng e cứ đòi
              ngủ với cả còn chẳng là phiên bản ngày xưa nữa a thật chẳng muốn
              chia sẻ.Chắc là nói vậy thôi,đọc đến đây là cũng biết ơn lắm luôn
              rồi.Chỉ mong là sau này giữ lại 1 góc với những kỉ niệm thật là
              đẹp.Anh hi vọng là cả 2 sẽ tập trung phát triển bản thân và có
              cuộc sống thật tốt trong tương lai.ĐÂY LÀ ĐIỂM CUỐI CỦA MỐI TÌNH
              NÀY RỒI!!,thật sự là quá khứ quá đẹp để mà a phải luyến tiếc gì cả
              giờ phút này a chọn mình dừng hẳn cũng là dành cho cái mối quan hệ
              cũ của mình 1 góc thật là nhớ!!!
            </p>

            <p className="text-gray-800 font-medium whitespace-pre-wrap break-words text-lg md:text-2xl">
              Sống thật hạnh phúc và bớt hậu đậu đi nhé!.Buồn thì mở ra đọc khi
              nào em mất phương hướng thì a luôn tin rằng e có thể vượt qua và
              hoàn thành nó thật tốt nha.Tin emmm!!!!!!
            </p>

            <div className="flex items-center justify-between pt-6">
              <span className="text-base md:text-xl text-rose-400 font-sans italic">
                (bấm ✕ để cất đi những lời cuối,hihih con này em thích nì)
              </span>
              <img
                src="/imgthokhoc.jpg"
                alt="Cat Sticker"
                className="w-20 h-20 md:w-28 md:h-28 object-cover rounded-2xl shadow-md border-2 border-white rotate-[-4deg] hover:rotate-0 transition-transform shrink-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== BUNG HOA: chỉ ở lần mở thư đầu tiên ===== */}
      {showFlowers && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[70] overflow-hidden select-none"
        >
          {flowers.map((flower, index) => {
            const flowerStyle: CSSProperties & Record<string, string> = {
              "--fx": `${flower.x}px`,
              "--fy": `${flower.y}px`,
              "--spin": `${flower.spin}deg`,
              fontSize: `${flower.size}px`,
              animationDuration: `${flower.duration}s`,
              animationDelay: `${flower.delay}s`,
            };
            return (
              <span
                key={index}
                className="flower absolute left-1/2 top-1/2 leading-none opacity-0"
                style={flowerStyle}
              >
                {flower.emoji}
              </span>
            );
          })}
        </div>
      )}

      {/* ===== POP-UP NHẬP MÃ: 6 ô, mỗi ô một số ===== */}
      {phase === "asking" && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pin-title"
          onClick={handleCancelPin}
        >
          {/* Lớp mờ phía sau */}
          <div className="pin-backdrop absolute inset-0 bg-black/55 backdrop-blur-sm" />

          <form
            onSubmit={handleSubmitPin}
            onClick={(event) => event.stopPropagation()}
            className="pin-card relative w-full max-w-md rounded-3xl bg-[#fdfbf7] p-6 md:p-7 shadow-2xl border border-rose-200"
          >
            <button
              type="button"
              onClick={handleCancelPin}
              aria-label="Đóng"
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 border border-rose-200 shadow-sm flex items-center justify-center text-rose-500 hover:bg-white transition-colors"
            >
              ✕
            </button>

            <div className="text-center text-4xl mb-2">🔒</div>

            <h2
              id="pin-title"
              className="text-center font-bold text-rose-600 text-2xl md:text-3xl"
            >
              Nhập mã để mở thư
            </h2>
            <p className="mt-1 text-center text-rose-400 text-base md:text-lg">
              Chỉ Bông mới biết {PIN_LENGTH} số này thôi 💌
            </p>

            <div
              className={`mt-5 flex justify-center gap-1.5 sm:gap-2 md:gap-3 ${
                isShaking ? "pin-shake" : ""
              }`}
              onAnimationEnd={() => setIsShaking(false)}
            >
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputsRef.current[index] = element;
                  }}
                  value={digit}
                  onChange={(event) =>
                    handleDigitChange(index, event.target.value)
                  }
                  onKeyDown={(event) => handleDigitKeyDown(index, event)}
                  onPaste={(event) => handleDigitPaste(index, event)}
                  onFocus={(event) => event.target.select()}
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={1}
                  aria-label={`Số thứ ${index + 1}`}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "pin-error" : undefined}
                  className={`h-12 w-10 sm:w-11 md:h-14 md:w-12 rounded-2xl border bg-white text-center font-sans text-2xl md:text-3xl font-bold text-rose-500 outline-none transition-colors ${
                    error
                      ? "border-rose-400 ring-2 ring-rose-200"
                      : "border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                  }`}
                />
              ))}
            </div>

            {/* Giữ chỗ cố định để pop-up không bị nhảy khi hiện lỗi */}
            <p
              id="pin-error"
              role="alert"
              className="mt-3 min-h-6 text-center text-base text-rose-500"
            >
              {error}
            </p>

            <div className="mt-1 flex items-center justify-center gap-2">
              <button
                type="submit"
                disabled={!isPinComplete}
                className="rounded-full bg-rose-400 px-6 py-3 text-lg font-bold text-white shadow-lg transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-rose-200"
              >
                Mở thư ✨
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPin((value) => !value);
                  // Bấm xem mã xong thì con trỏ quay lại ô đang cần gõ.
                  const firstEmpty = digits.findIndex((digit) => !digit);
                  focusInput(firstEmpty === -1 ? PIN_LENGTH - 1 : firstEmpty);
                }}
                aria-label={showPin ? "Ẩn mã" : "Hiện mã"}
                className="w-11 h-11 rounded-full border border-rose-200 bg-white text-lg flex items-center justify-center hover:bg-rose-50 transition-colors"
              >
                {showPin ? "🙈" : "👁️"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
