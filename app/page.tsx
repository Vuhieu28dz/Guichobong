'use client';

import { useState, useRef } from 'react';
import { Charm } from 'next/font/google';

// Font viết tay lãng mạn CÓ hỗ trợ đầy đủ dấu tiếng Việt.
// (Dancing Script KHÔNG có bộ dấu tiếng Việt đầy đủ — đó là nguyên nhân
// gây mất dấu/lỗi hiển thị chữ trước đây.)
const charm = Charm({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '700'],
  display: 'swap',
  fallback: ['Be Vietnam Pro', 'Segoe UI', 'system-ui', 'sans-serif'],
});

export default function LetterPage() {
  const [isOpen, setIsOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleToggleLetter = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (audioRef.current) {
      if (nextState) {
        audioRef.current.play().catch((err) => console.log('Lỗi phát nhạc:', err));
      } else {
        audioRef.current.pause();
      }
    }
  };

  return (
    <div className={`relative h-[100dvh] w-screen overflow-hidden font-sans select-none ${charm.className}`}>
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
      `}</style>

      {/* File nhạc nền */}
      <audio ref={audioRef} src="/onlyyou.mp3" loop />

      {/* Ảnh nền */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat filter brightness-90 contrast-100"
        style={{ backgroundImage: "url('/chungminh.jpg')" }}
      />
      <div className="absolute inset-0 bg-black/25" />

      {/* ===== TRẠNG THÁI ĐÓNG: phong bì nhỏ giữa màn hình ===== */}
      <div
        className="absolute inset-0 flex items-center justify-center p-4 transition-all duration-500 ease-in-out"
        style={{
          opacity: isOpen ? 0 : 1,
          transform: isOpen ? 'scale(0.9)' : 'scale(1)',
          pointerEvents: isOpen ? 'none' : 'auto',
        }}
      >
        <div
          onClick={handleToggleLetter}
          className="relative cursor-pointer hover:scale-105 transition-transform duration-300"
          style={{ width: 'clamp(240px, 58vw, 400px)', height: 'clamp(220px, 36dvh, 300px)' }}
        >
          <div className="relative w-full h-full bg-rose-100/95 rounded-b-2xl shadow-2xl border-x border-b border-rose-200/60">
            <div
              className="absolute top-0 left-0 w-full z-20 bg-rose-300"
              style={{ height: 'clamp(90px, 20vh, 220px)', clipPath: 'polygon(0 0, 50% 68%, 100% 0)' }}
            />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-white/90 p-2.5 md:p-3.5 rounded-full shadow-lg border border-rose-200 animate-bounce text-lg md:text-2xl">
              💌
            </div>
          </div>
          <div className="absolute -bottom-8 left-0 right-0 text-center text-white/95 text-xs md:text-sm font-medium drop-shadow-md">
            Chạm vào phong bì để mở thư ✨
          </div>
        </div>
      </div>

      {/* ===== TRẠNG THÁI MỞ: tờ thư phủ kín toàn màn hình, cuộn để đọc ===== */}
      <div
        className="fixed inset-0 z-40 transition-all duration-500 ease-in-out"
        style={{
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'scale(1)' : 'scale(0.96)',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        <div
          className="ruled-paper h-[100dvh] w-screen overflow-y-auto bg-[#fdfbf7]"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            paddingTop: 'max(env(safe-area-inset-top), 1.5rem)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 2.5rem)',
            paddingLeft: 'max(env(safe-area-inset-left), clamp(1.25rem, 6vw, 4rem))',
            paddingRight: 'max(env(safe-area-inset-right), clamp(1.25rem, 6vw, 4rem))',
          }}
        >
          {/* Nút đóng thư */}
          <button
            onClick={handleToggleLetter}
            aria-label="Đóng thư"
            className="fixed z-50 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/90 shadow-lg border border-rose-200 flex items-center justify-center text-rose-500 text-xl hover:bg-white transition-colors"
            style={{ top: 'max(env(safe-area-inset-top), 1rem)', right: 'max(env(safe-area-inset-right), 1rem)' }}
          >
            ✕
          </button>

          {/* Tem thư trang trí */}
          <div className="absolute top-4 right-16 w-10 h-12 md:w-14 md:h-16 bg-rose-50 border-2 border-dashed border-rose-300 rounded-lg flex items-center justify-center text-sm md:text-base text-rose-400 rotate-6 shadow-sm">
            🌸
          </div>

          {/* Nội dung thư - rộng dễ đọc, tự động xuống dòng, khớp dòng kẻ, viết dài bao nhiêu cũng cuộn được */}
          <div className="max-w-2xl mx-auto text-gray-800 space-y-2">
            <h2
              className="font-bold text-rose-600"
              style={{ fontSize: 'clamp(1.75rem, 5vw, 3rem)' }}
            >
              Gửi Bông thúi,anh tự làm đó khi nào buồn thì có thể mang ra đọc lại những lời cuối!! ✨
            </h2>

            <p className="text-gray-800 font-medium whitespace-pre-wrap break-words text-lg md:text-2xl">
              Thật buồn khi lại phải viết những dòng này.Haizz nhiều lần quá mà giờ chả biết viết như này tiếp liệu nó có giá trị không và không biết e có đọc nó nghiêm túc nữa không,hi vọng là e sẽ đọc.Nhưng thật sự là a viết những lời này để níu kéo chỉ là a muốn e biết rằng a đã quay lại và hi vọng tình yêu 1 cách tử tế nhất và tìm lại phiên bản của chính mình ngày đó.Em có biết mình của thời điểm bây giờ khác với thời điểm ngày xưa là gì không.Đó là ở thời điểm xưa đích đến của chúng ta là cưới nhau và a chỉ muốn e là người cuối cùng mà a yêu,tình yêu đơn giản không nghĩ gì về tương lai,nhưng bây giờ có lẽ là lúc mình trưởng thành hơn mình không chỉ đơn giản nghĩ về tình yêu nữa mà còn lo lắng cho tương lai sự nghiệp.Sau 3 ngày không nhắn tin,a đã cho bản thân a thời gian suy nghĩ thật thấu đáo để nói ra những điều này.Anh đã thực sự hi vọng ngày mình quay lại bắt đầu với 1 mối quan hệ nghiêm túc a muốn tập trung vào chỉ 1 người,yêu 1 người mà người đó sẽ luôn cùng chung hướng đi ủng hộ mình mọi thứ và cho mình cảm giác mình là duy nhất(giống mình của ngày xưa ý)anh đã cố gắng đi tìm lại phiên bản đó của mình nhưng có lẽ e của phiên bản đó đã thực sự biến mất rồi.Anh rất ghét việc phải chặn e cũng như a nói là a thấy cái việc đó nó rất là trẻ trâu ý,thật lòng a k muốn biến e thành người xa lạ đâu nhưng ở lúc đó a đã rất tổn thương và a k muốn thấy những lời nói đó nữa và nếu k chặn thì a sẽ lại yếu lòng mình lại lặp lại vòng lặp đó thật là tốn thời gian của nhau.3 ngày qua a không soi e hay cố biết e làm bất kể thứ gì vì a không muốn thấy những thứ đã hình thành lên nỗi sợ của a,a đã phải cố làm bản thân a thật bận rộn để không nghĩ tới e ý.Cũng xin lỗi e nhiều khi a lại chửi bậy a cũng chỉ biết chẹp chẹp “Mình lại thế rồi” nhưng lúc đó là a vùng vẫy không chấp nhận cái phiên bản ngày xưa của em đi mất rồi đó.Em có biết là e của ngày xưa khi a gặp biến cố hay chuyện gì đen đủi e sẽ như nào không?Em sẽ đến xong ôm anh rồi e bảo: “Huhuhu em thương anh lắm ý”,e luôn lẽo đẽo theo sau dù a có làm cái gì.Mỗi lần như thế a chỉ muốn ôm e thật chặt th.Hay cả lúc a vẫn nhớ mãi là mình cãi nhau a im lặng xong em ra tận Hòa Lạc và ngồi khóc,lúc đấy a kiểu nhìn mà đau lòng luôn “UI Bông của mình,mình đã làm cái gì vậy”thề chỉ muốn ôm thật chặt và hứa là không bao giờ cãi nhau nữa thôi.
            </p>

            <p className="text-gray-800 font-medium whitespace-pre-wrap break-words text-lg md:text-2xl">
              Cũng tiếc vì khoảng thời gian đó a luôn cố tỏ ra lạnh lùng nhưng thật lòng thì a đã rất hạnh phúc khoảng thời gian đó và yêu e nhiều lắm.Nhưng a cũng đã nói cho lí do của a là có nỗi đau và nỗi sợ thực chất thì e sẽ k hiểu được haizzzz chắc là e cũng có nỗi đau riêng th nhưng a nghĩ là nó hong bằng a.Giờ mối quan hệ xung quanh của e thật là nhiều người là con zai a khá mệt mỏi khoản đó đúng là khác với ngày xưa thiệt vì a luôn có thể bị đá mà cũng ngay cả có yêu lại mình cũng chẳng thể đi ăn đi chơi với nhau 1 cách tự nhiên.Anh và em thật khác nhau,tiếc thật sao e lại xóa hết kỉ niệm vậy!!,tất cả mọi thứ mình có với nhau a luôn giữ a chẳng xóa 1 cái gì ngay cả tin nhắn lần đầu mình quen nhau,anh không muốn xóa ngay cả giây phút này vì a nhớ a sẽ mở ra đọc.Không phải vì lụy...chỉ là a sợ rằng a quên mất ngày xưa mình hạnh phúc như nào,anh yêu em như nào tình cảm lớn ra sao.Anh không muốn quên mất phiên bản mà mình từng rất yêu nhau đó cũng là lí do rất lớn để a quyết định nói ra những dòng này.Và anh chọn dừng lại để bảo vệ cho tình yêu và kỉ niệm đó,cũng như bảo vệ phiên bản tuyệt vời đó của e trong mắt a,có thể nói hơi phiến diện nhưng a dạo này hay nói e khác xưa quá thật ra a chẳng chấp nhận thực tại ấy đâu nhưng a nghĩ là “oke chắc là tại lâu mình không gặp,chỉ cần gặp lại là sẽ quay trở lại phiên bản ngày xưa đó”nhưng thực tế thật là khác.Những cách cư xử những cách hoạt động thật là khác vì a nhớ e của ngày xưa yêu thương  và quan tâm a nhiều như nào nên giờ phút này a muốn dừng lại để không phải thấy phiên bản “Bông của anh” ngày hành xử càng khác.Có lẽ e cũng chẳng nhớ ngày xưa mình hạnh phúc như nào,e yêu a ra sao chắc tại e xóa hết cái kỉ niệm đó đi nên con người của phiên bản đó cũng đi luôn rồi!!!Cái ngày gặp gần nhất,thậm chí a còn không muốn kiểm tra hay làm gì máy điện thoại cả vì a muốn bảo vệ hình ảnh Bông trong mắt a.Anh chưa bao giờ hi vọng là người bước tiếp của mình trong tương lai không phải e cả,a luôn  muốn người đấy là em ý nên a chưa bao giờ mở lòng với ai cả vì a sợ rằng e sẽ quay lại,đúng hơn là a luôn đợi e quay lại,nhưng e cũng mở lòng r mà e còn cho người ta cảm giác lụy và chưa gặp được ai vui như e.Chắc cũng là lí do phiên bản này e khá phớt lờ a khi mình cãi nhau.Giờ thì a hiểu cảm giác ngày xưa của e rồi.
            </p>

            <p className="text-gray-800 font-medium whitespace-pre-wrap break-words text-lg md:text-2xl">
            Khi cãi nhau cứ im lặng xong lại làm đối phương nghi ngờ tình cảm của mình.Nhưng lúc đó a rất yêu e a luôn đợi chờ tin nhắn ý.Giờ thì chắc e phiên bản khác hì.Đừng nghĩ linh tinh nha vì a muốn viết là để kết thúc chứ không phải quay lại.Hmmm còn chuyện tương lai của cả 2,nói thật thì là định hướng thật khác nhau đó là lí do a muốn ta nói chuyện nghiêm túc 1 buổi về vấn đề đó nhưng e cứ đòi ngủ với cả còn chẳng là phiên bản ngày xưa nữa a thật chẳng muốn chia sẻ.Chắc là nói vậy thôi,đọc đến đây là cũng biết ơn lắm luôn rồi.Chỉ mong là sau này giữ lại 1 góc với những kỉ niệm thật là đẹp.Anh hi vọng là cả 2 sẽ tập trung phát triển bản thân và có cuộc sống thật tốt trong tương lai.ĐÂY LÀ ĐIỂM CUỐI CỦA MỐI TÌNH NÀY RỒI!!,thật sự là quá khứ quá đẹp để mà a phải luyến tiếc gì cả giờ phút này a chọn mình dừng hẳn cũng là dành cho cái mối quan hệ cũ của mình 1 góc thật là nhớ!!!
            </p>

            <p className="text-gray-800 font-medium whitespace-pre-wrap break-words text-lg md:text-2xl">
              Sống thật hạnh phúc và bớt hậu đậu đi nhé!.Buồn thì mở ra đọc khi nào em mất phương hướng thì a luôn tin rằng e có thể vượt qua và hoàn thành nó thật tốt nha.Tin emmm!!!!!!
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
    </div>
  );
}