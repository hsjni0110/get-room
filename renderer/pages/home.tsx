import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ipcRenderer } from 'electron';

function Home() {

  const [region, setRegion] = useState('');
  const [RegionShape, setResionShage] = useState('');
  const [Explanation, setExplanation] = useState('');
  const [description, setDescription] = useState('웹 구조 상 정보를 받아오는데 시간이 걸립니다. (300개 기준 5분, 1000개 기준 15분정도)');
  const handleRegion = (e:any) => {
    e.preventDefault();

    setRegion(e.target.value);
  }

  /* 방 찾기 메서드 */
  const SearchRoom = (e:any) => {
    e.preventDefault();
    setDescription('진행 현황');

    let payload = {
      region: region,
      regionShape: '2',
    }

    ipcRenderer.send('get-room', payload)
  }

  useEffect(() => {
    ipcRenderer.on('explanation', (e: any, payload) => {
      setExplanation(payload);
    })
  }, [ipcRenderer])

  return (
    <React.Fragment>
      <Head>
        <title>Get Room</title>
      </Head>
      <h1 className='text-center min-w-[340px] font-semibold text-[36px] mt-[74px] mb-[54px]'>네이버 부동산 방 찾기</h1>

      <div className='flex flex-row px-10 mx-3 bg-gray-500 py-3 rounded-[20px] gap-6'>
        {/* left */}
        <div className='flex flex-col gap-8 py-5 w-full'>
          
            <div className=''>
              <h3 className='text-center'>지역</h3>
              <input className='shadow-lg rounded-[10px] mt-2 text-[#000000] w-full py-1 px-2' value={region} onChange={handleRegion} />
            </div>
            <div>
              <h3 className='text-center'>방 형태</h3>
              <div className='shadow-lg rounded-[10px] mt-2 text-[#000000] w-full py-1 px-2 bg-white'>
                원룸/투룸
              </div>
            </div>
            <button className='bg-[#242424] shadow-lg rounded-[8px] py-2' onClick={SearchRoom}>검색하기</button>
          
        </div>

        {/* right */}
        <div className='bg-white w-full rounded-[20px] ml-3 flex items-center flex-col justify-center'>
          <p className='text-center font-semibold text-[#000000]'>{description}</p>
          <p className='text-center text-[#000000]'>{Explanation}</p>
        </div>
      </div>
    </React.Fragment>
  );
}

export default Home;
