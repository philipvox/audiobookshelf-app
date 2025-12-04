import React from "react";

export const Home = (): JSX.Element => {
  const books = [
    { id: 1, title: "The Butcher's\nMasquerade", liked: true },
    { id: 2, title: "The Butcher's\nMasquerade", liked: true },
    { id: 3, title: "The Butcher's\nMasquerade", liked: true },
    { id: 4, title: "The Butcher's\nMasquerade", liked: false },
  ];

  const series = [
    { id: 1, title: "The Butcher's\nMasquerade", liked: true },
    { id: 2, title: "The Butcher's\nMasquerade", liked: true },
    { id: 3, title: "The Butcher's\nMasquerade", liked: true },
    { id: 4, title: "The Butcher's\nMasquerade", liked: false },
  ];

  const playlists = [
    { id: 1, title: "The Butcher's\nMasquerade" },
    { id: 2, title: "The Butcher's\nMasquerade" },
    { id: 3, title: "The Butcher's\nMasquerade" },
    { id: 4, title: "The Butcher's\nMasquerade" },
  ];

  return (
    <div
      className="bg-black w-full min-w-[402px] min-h-[1057px] relative"
      data-model-id="224:22"
    >
      <div className="absolute top-0 left-0 w-[402px] h-[579px] opacity-50 bg-[url(/img/rectangle-68.svg)] bg-[100%_100%]">
        <img
          className="absolute top-0 left-0 w-[402px] h-[579px]"
          alt="Cover"
          src="/img/cover.svg"
        />

        <img
          className="absolute top-[379px] left-0.5 w-[400px] h-[200px]"
          alt="To black gradient"
          src="/img/to-black-gradient.svg"
        />
      </div>

      <div className="flex flex-col w-[402px] items-center gap-6 absolute top-[18px] left-0">
        <img
          className="relative w-[382.41px] flex-[0_0_auto]"
          alt="Min player home"
          src="/img/min-player-home.svg"
        />

        <div className="flex items-center gap-2.5 relative self-stretch w-full flex-[0_0_auto]">
          <div className="flex flex-col w-[402px] items-center gap-[43px] relative">
            <div className="relative w-[263px] h-[316.03px]">
              <div className="absolute w-[162px] h-14 top-[260px] left-[52px] flex">
                <img
                  className="mt-[0.1px] w-[52.4px] h-[55.84px]"
                  alt="R ewind"
                  src="/img/rewind.svg"
                />

                <img
                  className="mt-[0.1px] w-[52.4px] h-[55.84px] ml-[2.1px]"
                  alt="Fast forward"
                  src="/img/fast-forward.svg"
                />

                <div className="mt-0 w-[52.74px] h-[56.03px] relative ml-[2.3px]">
                  <img
                    className="absolute top-[15px] left-3.5 w-[23px] h-[27px]"
                    alt="Icon"
                    src="/img/icon.svg"
                  />

                  <img
                    className="absolute top-px left-0 w-[53px] h-14"
                    alt="Rectangle"
                    src="/img/rectangle-22.png"
                  />

                  <img
                    className="absolute top-[-25px] left-[-25px] w-[74px] h-[75px]"
                    alt="Rectangle"
                    src="/img/rectangle-25.png"
                  />

                  <div className="absolute top-0 left-px w-[52px] h-14 rounded-[5.21px] border border-solid border-[#ffffff80] [background:radial-gradient(50%_50%_at_87%_50%,rgba(255,255,255,0.1)_0%,rgba(0,0,0,0)_100%),radial-gradient(50%_50%_at_65%_109%,rgba(255,255,255,0.1)_0%,rgba(0,0,0,0)_100%),linear-gradient(180deg,rgba(0,0,0,0)_75%,rgba(255,255,255,0.2)_79%),linear-gradient(360deg,rgba(0,0,0,0)_60%,rgba(0,0,0,0.2)_60%)]" />
                </div>
              </div>

              <div className="absolute top-0 left-0 w-[263px] h-[264px] bg-[#7d7d7d] rounded-[8.79px] shadow-[0px_8px_20px_#00000073]" />
            </div>

            <div className="flex flex-col items-start gap-[23px] px-[29px] py-0 relative self-stretch w-full flex-[0_0_auto]">
              <div className="flex flex-col items-start gap-[15px] relative self-stretch w-full flex-[0_0_auto]">
                <div className="relative w-[349.9px] h-[17px] mr-[-5.90px]">
                  <div className="absolute top-0 left-[167px] w-[179px] h-[17px] flex items-end justify-center [font-family:'Golos_Text',Helvetica] font-normal text-white text-sm text-right tracking-[0] leading-[normal]">
                    View All
                  </div>

                  <div className="absolute top-0 left-0 w-[179px] h-[17px] flex items-end justify-center [font-family:'Golos_Text',Helvetica] font-bold text-white text-sm tracking-[0] leading-[normal]">
                    Your Books
                  </div>
                </div>

                <div className="flex items-center gap-2.5 relative self-stretch w-full flex-[0_0_auto]">
                  {books.map((book, index) => (
                    <div
                      key={book.id}
                      className={`relative w-[110px] h-[141.5px] ${
                        index === books.length - 1
                          ? "mr-[-120.00px]"
                          : index === books.length - 2
                            ? "mr-[-2.00px]"
                            : ""
                      }`}
                    >
                      <div className="top-[115px] absolute left-0.5 w-[106px] [font-family:'Gothic_A1',Helvetica] font-normal text-white text-xs tracking-[0] leading-[12.4px]">
                        {book.title.split("\n").map((line, i) => (
                          <React.Fragment key={i}>
                            {line}
                            {i === 0 && <br />}
                          </React.Fragment>
                        ))}
                      </div>

                      <div className="absolute top-0 left-0 w-[106px] h-[106px] bg-[#7d7d7d] rounded-[5px]" />

                      <img
                        className={`absolute w-[17px] h-3.5 ${
                          book.liked
                            ? "top-[121px] left-[89px]"
                            : "top-[-373px] left-[60px]"
                        }`}
                        alt="Heart"
                        src={book.liked ? "/img/heart-5.svg" : "/img/heart.svg"}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-start gap-5 relative self-stretch w-full flex-[0_0_auto]">
                <div className="relative w-[349.9px] h-[17px] mr-[-5.90px]">
                  <div className="absolute top-0 left-0 w-[179px] h-[17px] flex items-end justify-center [font-family:'Golos_Text',Helvetica] font-bold text-white text-sm tracking-[0] leading-[normal]">
                    Your Series
                  </div>

                  <div className="absolute top-0 left-[167px] w-[179px] h-[17px] flex items-end justify-center [font-family:'Golos_Text',Helvetica] font-normal text-white text-sm text-right tracking-[0] leading-[normal]">
                    View All
                  </div>
                </div>

                <div className="flex items-center gap-2.5 relative self-stretch w-full flex-[0_0_auto]">
                  {series.map((item, index) => (
                    <div
                      key={item.id}
                      className={`relative w-[110px] h-[86.5px] ${
                        index === series.length - 1
                          ? "mr-[-120.00px]"
                          : index === series.length - 2
                            ? "mr-[-2.00px]"
                            : ""
                      }`}
                    >
                      {[0, 17, 34, 51, 68].map((leftPos) => (
                        <div
                          key={leftPos}
                          className="absolute top-0 w-[35px] h-[51px] bg-[#7d7d7d] rounded-[5px] shadow-[9px_4px_2px_#00000075]"
                          style={{ left: `${leftPos}px` }}
                        />
                      ))}

                      <div className="top-[60px] absolute left-0.5 w-[106px] [font-family:'Gothic_A1',Helvetica] font-normal text-white text-xs tracking-[0] leading-[12.4px]">
                        {item.title.split("\n").map((line, i) => (
                          <React.Fragment key={i}>
                            {line}
                            {i === 0 && <br />}
                          </React.Fragment>
                        ))}
                      </div>

                      <img
                        className={`absolute w-[17px] h-3.5 ${
                          item.liked
                            ? "top-[66px] left-[89px]"
                            : "top-[-630px] left-[60px]"
                        }`}
                        alt="Heart"
                        src={item.liked ? "/img/heart-5.svg" : "/img/image.svg"}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-start gap-4 relative self-stretch w-full flex-[0_0_auto]">
                <div className="relative w-[349.9px] h-[17px] mr-[-5.90px]">
                  <div className="absolute top-0 left-0 w-[179px] h-[17px] flex items-end justify-center [font-family:'Golos_Text',Helvetica] font-bold text-white text-sm tracking-[0] leading-[normal]">
                    Your Playlists
                  </div>

                  <div className="absolute top-0 left-[167px] w-[179px] h-[17px] flex items-end justify-center [font-family:'Golos_Text',Helvetica] font-normal text-white text-sm text-right tracking-[0] leading-[normal]">
                    View All
                  </div>
                </div>

                <div className="flex items-center gap-2.5 relative self-stretch w-full flex-[0_0_auto]">
                  {playlists.map((playlist, index) => (
                    <div
                      key={playlist.id}
                      className={`relative w-[110px] h-[141.5px] ${
                        index === playlists.length - 1
                          ? "mr-[-120.00px]"
                          : index === playlists.length - 2
                            ? "mr-[-2.00px]"
                            : ""
                      }`}
                    >
                      <div className="absolute top-[115px] left-0.5 w-[106px] [font-family:'Gothic_A1',Helvetica] font-normal text-white text-xs tracking-[0] leading-[12.4px]">
                        {playlist.title.split("\n").map((line, i) => (
                          <React.Fragment key={i}>
                            {line}
                            {i === 0 && <br />}
                          </React.Fragment>
                        ))}
                      </div>

                      <div className="absolute top-0 left-0 w-[51px] h-[51px] bg-[#7d7d7d] rounded-[5px]" />

                      <div className="absolute top-[55px] left-0 w-[51px] h-[51px] bg-[#7d7d7d] rounded-[5px]" />

                      <div className="absolute top-0 left-[55px] w-[51px] h-[51px] bg-[#7d7d7d] rounded-[5px]" />

                      <div className="absolute top-[55px] left-[55px] w-[51px] h-[51px] bg-[#7d7d7d] rounded-[5px]" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
