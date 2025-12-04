import React, { useState } from "react";

export const PlayerPage = (): JSX.Element => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const playerData = {
    title: "The Butcher's Masquerade",
    chapter: "22",
    currentTime: "00:00:00",
    playbackSpeed: "1.25x",
    remainingTime: "0m",
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
  };

  return (
    <div
      className="bg-black overflow-hidden w-full min-w-[402px] h-[874px] relative"
      data-model-id="232:408"
    >
      <img
        className="absolute top-0 left-0 w-[402px] h-[426px]"
        alt="Background gradient"
        src="/img/group-153.png"
      />

      <button
        className="absolute w-[32.55%] h-[15.91%] top-[71.62%] left-[67.69%] cursor-pointer"
        onClick={handlePlayPause}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        <img
          className="absolute w-[50.00%] h-[59.56%] top-[22.93%] left-[26.56%]"
          alt=""
          src="/img/icon.svg"
        />

        <img
          className="absolute top-0 left-0 w-[130px] h-[139px]"
          alt=""
          src="/img/rectangle-22.png"
        />

        <img
          className="absolute top-[-19px] left-[-19px] w-[111px] h-32"
          alt=""
          src="/img/rectangle-25.svg"
        />

        <div className="absolute top-px left-px w-[130px] h-[139px] rounded-[5.21px] border border-solid border-[#ffffff80] [background:radial-gradient(50%_50%_at_87%_50%,rgba(255,255,255,0.1)_0%,rgba(0,0,0,0)_100%),radial-gradient(50%_50%_at_65%_109%,rgba(255,255,255,0.1)_0%,rgba(0,0,0,0)_100%),linear-gradient(180deg,rgba(0,0,0,0)_75%,rgba(255,255,255,0.2)_79%),linear-gradient(360deg,rgba(0,0,0,0)_60%,rgba(0,0,0,0.2)_60%)]" />
      </button>

      <button
        className="absolute top-[626px] left-px w-[130px] h-[139px] cursor-pointer"
        aria-label="Rewind"
      >
        <img className="w-full h-full" alt="Rewind" src="/img/rewind.png" />
      </button>

      <button
        className="absolute top-[626px] left-[136px] w-[130px] h-[139px] cursor-pointer"
        aria-label="Fast forward"
      >
        <img
          className="w-full h-full"
          alt="Fast forward"
          src="/img/fast-forward.png"
        />
      </button>

      <div className="absolute top-[79px] left-[59px] w-[285px] h-[285px] bg-[#d9d9d9] rounded-[8.79px] shadow-[0px_8px_20px_#00000073]" />

      <img
        className="absolute top-[426px] left-0 w-[402px] h-[218px]"
        alt=""
        src="/img/rectangle-21.png"
      />

      <div className="absolute w-[382px] h-[61px] top-[538px] left-2.5 flex gap-[7.4px]">
        <div className="w-[239.73px] h-[61px] relative">
          <div className="absolute top-0 left-0 w-[236px] h-[61px] bg-black rounded-[5px]" />

          <div className="absolute top-[7px] left-[11px] w-[218px] h-[43px] blur-[2.5px]">
            <div className="absolute top-0 left-0 w-[120px] [font-family:'Pixel_Operator-Regular',Helvetica] font-normal text-white text-xl tracking-[0] leading-[20.7px]">
              {playerData.title.split(" ").slice(0, 2).join(" ")}
              <br />
              {playerData.title.split(" ").slice(2).join(" ")}
            </div>

            <div className="absolute top-0 left-[107px] w-[107px] [font-family:'Pixel_Operator-Regular',Helvetica] font-normal text-white text-xl text-right tracking-[0] leading-[20.7px]">
              Chpt.
              <br />
              {playerData.chapter}
            </div>
          </div>

          <div className="absolute top-[7px] left-[11px] w-[120px] [font-family:'Pixel_Operator-Regular',Helvetica] font-normal text-white text-xl tracking-[0] leading-[20.7px]">
            {playerData.title.split(" ").slice(0, 2).join(" ")}
            <br />
            {playerData.title.split(" ").slice(2).join(" ")}
          </div>

          <div className="absolute top-[7px] left-[118px] w-[107px] [font-family:'Pixel_Operator-Regular',Helvetica] font-normal text-white text-xl text-right tracking-[0] leading-[20.7px]">
            Chpt.
            <br />
            {playerData.chapter}
          </div>
        </div>

        <div className="w-[141.31px] h-[61px] relative">
          <div className="absolute top-px left-0 w-[135px] h-[61px] bg-black rounded-[5px]" />

          <div className="absolute top-1.5 right-[15px] w-[116px] h-[49px] blur-[2.5px]">
            <div className="-top-px right-7 absolute w-[89px] [-webkit-text-stroke:0.6px_#ffffff1a] [font-family:'Pixel_Operator_Mono-Regular',Helvetica] font-normal text-white text-xl tracking-[0] leading-[20.7px] whitespace-nowrap">
              {playerData.currentTime}
            </div>

            <div className="absolute top-[25px] right-[7px] w-[33px] [-webkit-text-stroke:0.6px_#ffffff1a] [font-family:'Pixel_Operator_Mono-Regular',Helvetica] font-normal text-[#f12802] text-xl text-right tracking-[0] leading-[20.7px] whitespace-nowrap">
              {playerData.remainingTime}
            </div>

            <div className="absolute top-[25px] right-[61px] w-[55px] [-webkit-text-stroke:0.6px_#ffffff1a] [font-family:'Pixel_Operator_Mono-Regular',Helvetica] font-normal text-white text-xl tracking-[0] leading-[20.7px] whitespace-nowrap">
              {playerData.playbackSpeed}
            </div>
          </div>

          <div className="top-[5px] right-[42px] absolute w-[89px] [-webkit-text-stroke:0.6px_#ffffff1a] [font-family:'Pixel_Operator_Mono-Regular',Helvetica] font-normal text-white text-xl tracking-[0] leading-[20.7px] whitespace-nowrap">
            {playerData.currentTime}
          </div>

          <div className="absolute top-[30px] right-5 w-[33px] [-webkit-text-stroke:0.6px_#ffffff1a] [font-family:'Pixel_Operator_Mono-Regular',Helvetica] font-normal text-[#f12802] text-xl text-right tracking-[0] leading-[20.7px] whitespace-nowrap">
            {playerData.remainingTime}
          </div>

          <div className="absolute top-[30px] right-[75px] w-[55px] [-webkit-text-stroke:0.6px_#ffffff1a] [font-family:'Pixel_Operator_Mono-Regular',Helvetica] font-normal text-white text-xl tracking-[0] leading-[20.7px] whitespace-nowrap">
            {playerData.playbackSpeed}
          </div>
        </div>
      </div>

      <button
        className="absolute w-[4.41%] h-0 top-[3.89%] left-[89.30%] cursor-pointer"
        onClick={handleFavorite}
        aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      >
        <img className="w-full h-auto" alt="" src="/img/heart.png" />
      </button>

      <button
        className="absolute top-[31px] left-8 w-[21px] h-[21px] cursor-pointer"
        aria-label="Download"
      >
        <img className="w-full h-full" alt="" src="/img/download.png" />
      </button>

      <nav
        className="absolute top-[792px] left-[38px] w-[329px] h-[60px]"
        aria-label="Main navigation"
      >
        <button
          className="absolute top-0 left-0 w-[60px] h-[60px] bg-[#252525] rounded-[87.61px] cursor-pointer"
          aria-label="Search"
        >
          <img
            className="absolute top-[21px] left-[21px] w-[18px] h-[18px]"
            alt=""
            src="/img/search.svg"
          />
        </button>

        <button
          className="absolute top-0 left-[269px] w-[60px] h-[60px] bg-[#252525] rounded-[87.61px] cursor-pointer"
          aria-label="Home"
        >
          <img
            className="absolute top-[21px] left-[21px] w-[18px] h-[18px]"
            alt=""
            src="/img/home.svg"
          />
        </button>
      </nav>

      <div className="absolute top-[437px] left-[11px] w-[381px] h-[87px] bg-black rounded-[5px]" />

      <img
        className="absolute top-[437px] left-[430px] w-[381px] h-[87px]"
        alt=""
        src="/img/rectangle-67.svg"
      />

      <div className="absolute top-[455px] left-[11px] w-[381px] h-[69px]">
        <img
          className="w-full h-full"
          alt="Audio waveform visualization"
          src="/img/vector-30.svg"
        />
      </div>
    </div>
  );
};
