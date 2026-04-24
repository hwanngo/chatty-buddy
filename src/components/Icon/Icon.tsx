import React from 'react';

// Each entry is the icon's verbatim SVG (copied exactly from the original file,
// preserving viewBox/fill/stroke/strokeWidth/className so appearance is identical).
const REGISTRY = {
  about: (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 512 512'
      className='h-4 w-4'
      fill='currentColor'
    >
      <path d='M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z' />
    </svg>
  ),
  attachment: (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      fill='none'
      viewBox='0 0 24 24'
    >
      <path
        fill='currentColor'
        fillRule='evenodd'
        d='M9 7a5 5 0 0 1 10 0v8a7 7 0 1 1-14 0V9a1 1 0 0 1 2 0v6a5 5 0 0 0 10 0V7a3 3 0 1 0-6 0v8a1 1 0 1 0 2 0V9a1 1 0 1 1 2 0v6a3 3 0 1 1-6 0z'
        clipRule='evenodd'
      ></path>
    </svg>
  ),
  calculator: (
    <svg fill='currentColor' viewBox='0 0 16 16' height='1em' width='1em'>
      <path d='M2 2a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V2zm2 .5v2a.5.5 0 00.5.5h7a.5.5 0 00.5-.5v-2a.5.5 0 00-.5-.5h-7a.5.5 0 00-.5.5zm0 4v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1a.5.5 0 00-.5.5zM4.5 9a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1zM4 12.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1a.5.5 0 00-.5.5zM7.5 6a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1zM7 9.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1a.5.5 0 00-.5.5zm.5 2.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1zM10 6.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1a.5.5 0 00-.5.5zm.5 2.5a.5.5 0 00-.5.5v4a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-4a.5.5 0 00-.5-.5h-1z' />
    </svg>
  ),
  chat: (
    <svg
      stroke='currentColor'
      fill='none'
      strokeWidth='2'
      viewBox='0 0 24 24'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='h-4 w-4'
      height='1em'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'></path>
    </svg>
  ),
  clone: (
    <svg viewBox='0 0 512 512' fill='currentColor' height='1em' width='1em'>
      <path d='M64 464h224c8.8 0 16-7.2 16-16v-64h48v64c0 35.3-28.7 64-64 64H64c-35.35 0-64-28.7-64-64V224c0-35.3 28.65-64 64-64h64v48H64c-8.84 0-16 7.2-16 16v224c0 8.8 7.16 16 16 16zm96-400c0-35.35 28.7-64 64-64h224c35.3 0 64 28.65 64 64v224c0 35.3-28.7 64-64 64H224c-35.3 0-64-28.7-64-64V64zm64 240h224c8.8 0 16-7.2 16-16V64c0-8.84-7.2-16-16-16H224c-8.8 0-16 7.16-16 16v224c0 8.8 7.2 16 16 16z' />
    </svg>
  ),
  colorPalette: (
    <svg viewBox='0 0 24 24' fill='currentColor' height='1em' width='1em'>
      <path d='M12 22A10 10 0 012 12 10 10 0 0112 2c5.5 0 10 4 10 9a6 6 0 01-6 6h-1.8c-.3 0-.5.2-.5.5 0 .1.1.2.1.3.4.5.6 1.1.6 1.7.1 1.4-1 2.5-2.4 2.5m0-18a8 8 0 00-8 8 8 8 0 008 8c.3 0 .5-.2.5-.5 0-.2-.1-.3-.1-.4-.4-.5-.6-1-.6-1.6 0-1.4 1.1-2.5 2.5-2.5H16a4 4 0 004-4c0-3.9-3.6-7-8-7m-5.5 6c.8 0 1.5.7 1.5 1.5S7.3 13 6.5 13 5 12.3 5 11.5 5.7 10 6.5 10m3-4c.8 0 1.5.7 1.5 1.5S10.3 9 9.5 9 8 8.3 8 7.5 8.7 6 9.5 6m5 0c.8 0 1.5.7 1.5 1.5S15.3 9 14.5 9 13 8.3 13 7.5 13.7 6 14.5 6m3 4c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5-1.5-.7-1.5-1.5.7-1.5 1.5-1.5z' />
    </svg>
  ),
  copy: (
    <svg
      stroke='currentColor'
      fill='none'
      strokeWidth='2'
      viewBox='0 0 24 24'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='h-4 w-4'
      height='1em'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'></path>
      <rect x='8' y='2' width='8' height='4' rx='1' ry='1'></rect>
    </svg>
  ),
  cross: (
    <svg
      stroke='currentColor'
      fill='none'
      strokeWidth='2'
      viewBox='0 0 24 24'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='h-4 w-4'
      height='1em'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <line x1='18' y1='6' x2='6' y2='18'></line>
      <line x1='6' y1='6' x2='18' y2='18'></line>
    </svg>
  ),
  cross2: (
    <svg
      aria-hidden='true'
      className='w-5 h-5'
      fill='currentColor'
      viewBox='0 0 20 20'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        fillRule='evenodd'
        d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
        clipRule='evenodd'
      ></path>
    </svg>
  ),
  delete: (
    <svg
      stroke='currentColor'
      fill='none'
      strokeWidth='2'
      viewBox='0 0 24 24'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='h-4 w-4'
      height='1em'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <polyline points='3 6 5 6 21 6'></polyline>
      <path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'></path>
      <line x1='10' y1='11' x2='10' y2='17'></line>
      <line x1='14' y1='11' x2='14' y2='17'></line>
    </svg>
  ),
  downArrow: (
    <svg
      stroke='currentColor'
      fill='none'
      strokeWidth='2'
      viewBox='0 0 24 24'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='h-4 w-4 m-1'
      height='1em'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <line x1='12' y1='5' x2='12' y2='19'></line>
      <polyline points='19 12 12 19 5 12'></polyline>
    </svg>
  ),
  downChevronArrow: (
    <svg
      className='w-4 h-4'
      aria-hidden='true'
      fill='none'
      stroke='currentColor'
      viewBox='0 0 24 24'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='2'
        d='M19 9l-7 7-7-7'
      ></path>
    </svg>
  ),
  edit: (
    <svg
      stroke='currentColor'
      fill='none'
      strokeWidth='2'
      viewBox='0 0 24 24'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='h-4 w-4'
      height='1em'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d='M12 20h9'></path>
      <path d='M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z'></path>
    </svg>
  ),
  edit2: (
    <svg
      stroke='currentColor'
      fill='none'
      strokeWidth='2'
      viewBox='0 0 24 24'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='h-4 w-4'
      height='1em'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'></path>
      <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'></path>
    </svg>
  ),
  export: (
    <svg
      fill='none'
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      viewBox='0 0 24 24'
      height='1em'
      width='1em'
    >
      <path stroke='none' d='M0 0h24v24H0z' />
      <path d='M14 3v4a1 1 0 001 1h4' />
      <path d='M11.5 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v5m-5 6h7m-3-3l3 3-3 3' />
    </svg>
  ),
  fileText: (
    <svg viewBox='0 0 1024 1024' fill='currentColor' height='1em' width='1em'>
      <path d='M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0042 42h216v494zM504 618H320c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h184c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8zM312 490v48c0 4.4 3.6 8 8 8h384c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8H320c-4.4 0-8 3.6-8 8z' />
    </svg>
  ),
  folder: (
    <svg viewBox='0 0 1024 1024' fill='currentColor' height='1em' width='1em'>
      <path d='M880 298.4H521L403.7 186.2a8.15 8.15 0 00-5.5-2.2H144c-17.7 0-32 14.3-32 32v592c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V330.4c0-17.7-14.3-32-32-32zM840 768H184V256h188.5l119.6 114.4H840V768z' />
    </svg>
  ),
  globe: (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='w-4 h-4'
      height='1em'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <circle cx='12' cy='12' r='10' />
      <line x1='2' y1='12' x2='22' y2='12' />
      <path d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' />
    </svg>
  ),
  google: (
    <svg fill='currentColor' viewBox='0 0 16 16' height='1em' width='1em'>
      <path d='M15.545 6.558a9.42 9.42 0 01.139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 118 0a7.689 7.689 0 015.352 2.082l-2.284 2.284A4.347 4.347 0 008 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.792 4.792 0 000 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.702 3.702 0 001.599-2.431H8v-3.08h7.545z' />
    </svg>
  ),
  image: (
    <svg viewBox='0 0 1024 1024' fill='currentColor' height='1em' width='1em'>
      <path d='M553.1 509.1l-77.8 99.2-41.1-52.4a8 8 0 00-12.6 0l-99.8 127.2a7.98 7.98 0 006.3 12.9H696c6.7 0 10.4-7.7 6.3-12.9l-136.5-174a8.1 8.1 0 00-12.7 0zM360 442a40 40 0 1080 0 40 40 0 10-80 0zm494.6-153.4L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0042 42h216v494z' />
    </svg>
  ),
  json: (
    <svg fill='currentColor' viewBox='0 0 16 16' height='1em' width='1em'>
      <path
        fillRule='evenodd'
        d='M14 4.5V11h-1V4.5h-2A1.5 1.5 0 019.5 3V1H4a1 1 0 00-1 1v9H2V2a2 2 0 012-2h5.5L14 4.5zM4.151 15.29a1.176 1.176 0 01-.111-.449h.764a.578.578 0 00.255.384c.07.049.154.087.25.114.095.028.201.041.319.041.164 0 .301-.023.413-.07a.559.559 0 00.255-.193.507.507 0 00.084-.29.387.387 0 00-.152-.326c-.101-.08-.256-.144-.463-.193l-.618-.143a1.72 1.72 0 01-.539-.214 1.001 1.001 0 01-.352-.367 1.068 1.068 0 01-.123-.524c0-.244.064-.457.19-.639.128-.181.304-.322.528-.422.225-.1.484-.149.777-.149.304 0 .564.05.779.152.217.102.384.239.5.41.12.17.186.359.2.566h-.75a.56.56 0 00-.12-.258.624.624 0 00-.246-.181.923.923 0 00-.37-.068c-.216 0-.387.05-.512.152a.472.472 0 00-.185.384c0 .121.048.22.144.3a.97.97 0 00.404.175l.621.143c.217.05.406.12.566.211a1 1 0 01.375.358c.09.148.135.335.135.56 0 .247-.063.466-.188.656a1.216 1.216 0 01-.539.439c-.234.105-.52.158-.858.158-.254 0-.476-.03-.665-.09a1.404 1.404 0 01-.478-.252 1.13 1.13 0 01-.29-.375zm-3.104-.033a1.32 1.32 0 01-.082-.466h.764a.576.576 0 00.074.27.499.499 0 00.454.246c.19 0 .33-.055.422-.164.091-.11.137-.265.137-.466v-2.745h.791v2.725c0 .44-.119.774-.357 1.005-.237.23-.565.345-.985.345a1.59 1.59 0 01-.568-.094 1.145 1.145 0 01-.407-.266 1.14 1.14 0 01-.243-.39zm9.091-1.585v.522c0 .256-.039.47-.117.641a.862.862 0 01-.322.387.877.877 0 01-.47.126.883.883 0 01-.47-.126.87.87 0 01-.32-.387 1.55 1.55 0 01-.117-.641v-.522c0-.258.039-.471.117-.641a.87.87 0 01.32-.387.868.868 0 01.47-.129c.177 0 .333.043.47.129a.862.862 0 01.322.387c.078.17.117.383.117.641zm.803.519v-.513c0-.377-.069-.701-.205-.973a1.46 1.46 0 00-.59-.63c-.253-.146-.559-.22-.916-.22-.356 0-.662.074-.92.22a1.441 1.441 0 00-.589.628c-.137.271-.205.596-.205.975v.513c0 .375.068.699.205.973.137.271.333.48.589.626.258.145.564.217.92.217.357 0 .663-.072.917-.217.256-.146.452-.355.589-.626.136-.274.205-.598.205-.973zm1.29-.935v2.675h-.746v-3.999h.662l1.752 2.66h.032v-2.66h.75v4h-.656l-1.761-2.676h-.032z'
      />
    </svg>
  ),
  markdown: (
    <svg viewBox='0 0 1024 1024' fill='currentColor' height='1em' width='1em'>
      <path d='M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0042 42h216v494zM429 481.2c-1.9-4.4-6.2-7.2-11-7.2h-35c-6.6 0-12 5.4-12 12v272c0 6.6 5.4 12 12 12h27.1c6.6 0 12-5.4 12-12V582.1l66.8 150.2a12 12 0 0011 7.1H524c4.7 0 9-2.8 11-7.1l66.8-150.6V758c0 6.6 5.4 12 12 12H641c6.6 0 12-5.4 12-12V486c0-6.6-5.4-12-12-12h-34.7c-4.8 0-9.1 2.8-11 7.2l-83.1 191-83.2-191z' />
    </svg>
  ),
  menu: (
    <svg
      stroke='currentColor'
      fill='none'
      strokeWidth='1.5'
      viewBox='0 0 24 24'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='h-6 w-6'
      height='1em'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <line x1='3' y1='12' x2='21' y2='12'></line>
      <line x1='3' y1='6' x2='21' y2='6'></line>
      <line x1='3' y1='18' x2='21' y2='18'></line>
    </svg>
  ),
  moon: (
    <svg
      stroke='currentColor'
      fill='none'
      strokeWidth='2'
      viewBox='0 0 24 24'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='h-4 w-4'
      height='1em'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'></path>
    </svg>
  ),
  newFolder: (
    <svg
      stroke='currentColor'
      fill='none'
      strokeWidth='2'
      viewBox='0 0 24 24'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='h-4 w-4'
      height='1em'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M12 19H5C3.89543 19 3 18.1046 3 17V7C3 5.89543 3.89543 5 5 5H9.58579C9.851 5 10.1054 5.10536 10.2929 5.29289L12 7H19C20.1046 7 21 7.89543 21 9V11'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M18 14V17M18 20V17M18 17H15M18 17H21'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  ),
  pdf: (
    <svg viewBox='0 0 1024 1024' fill='currentColor' height='1em' width='1em'>
      <path d='M531.3 574.4l.3-1.4c5.8-23.9 13.1-53.7 7.4-80.7-3.8-21.3-19.5-29.6-32.9-30.2-15.8-.7-29.9 8.3-33.4 21.4-6.6 24-.7 56.8 10.1 98.6-13.6 32.4-35.3 79.5-51.2 107.5-29.6 15.3-69.3 38.9-75.2 68.7-1.2 5.5.2 12.5 3.5 18.8 3.7 7 9.6 12.4 16.5 15 3 1.1 6.6 2 10.8 2 17.6 0 46.1-14.2 84.1-79.4 5.8-1.9 11.8-3.9 17.6-5.9 27.2-9.2 55.4-18.8 80.9-23.1 28.2 15.1 60.3 24.8 82.1 24.8 21.6 0 30.1-12.8 33.3-20.5 5.6-13.5 2.9-30.5-6.2-39.6-13.2-13-45.3-16.4-95.3-10.2-24.6-15-40.7-35.4-52.4-65.8zM421.6 726.3c-13.9 20.2-24.4 30.3-30.1 34.7 6.7-12.3 19.8-25.3 30.1-34.7zm87.6-235.5c5.2 8.9 4.5 35.8.5 49.4-4.9-19.9-5.6-48.1-2.7-51.4.8.1 1.5.7 2.2 2zm-1.6 120.5c10.7 18.5 24.2 34.4 39.1 46.2-21.6 4.9-41.3 13-58.9 20.2-4.2 1.7-8.3 3.4-12.3 5 13.3-24.1 24.4-51.4 32.1-71.4zm155.6 65.5c.1.2.2.5-.4.9h-.2l-.2.3c-.8.5-9 5.3-44.3-8.6 40.6-1.9 45 7.3 45.1 7.4zm191.4-388.2L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0042 42h216v494z' />
    </svg>
  ),
  plus: (
    <svg
      stroke='currentColor'
      fill='none'
      strokeWidth='2'
      viewBox='0 0 24 24'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='h-4 w-4'
      height='1em'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <line x1='12' y1='5' x2='12' y2='19'></line>
      <line x1='5' y1='12' x2='19' y2='12'></line>
    </svg>
  ),
  refresh: (
    <svg
      stroke='currentColor'
      fill='none'
      strokeWidth='1.5'
      viewBox='0 0 24 24'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='h-3 w-3'
      height='1em'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <polyline points='1 4 1 10 7 10'></polyline>
      <polyline points='23 20 23 14 17 14'></polyline>
      <path d='M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15'></path>
    </svg>
  ),
  send: (
    <svg
      stroke='currentColor'
      fill='none'
      strokeWidth='2'
      viewBox='0 0 24 24'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='h-4 w-4 mr-1'
      height='1em'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <line x1='22' y1='2' x2='11' y2='13'></line>
      <polygon points='22 2 15 22 11 13 2 9 22 2'></polygon>
    </svg>
  ),
  setting: (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      fill='currentColor'
      viewBox='0 0 512 512'
    >
      <path d='M481.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-30.9 28.1c-7.7 7.1-11.4 17.5-10.9 27.9c.1 2.9 .2 5.8 .2 8.8s-.1 5.9-.2 8.8c-.5 10.5 3.1 20.9 10.9 27.9l30.9 28.1c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-39.7-12.6c-10-3.2-20.8-1.1-29.7 4.6c-4.9 3.1-9.9 6.1-15.1 8.7c-9.3 4.8-16.5 13.2-18.8 23.4l-8.9 40.7c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-8.9-40.7c-2.2-10.2-9.5-18.6-18.8-23.4c-5.2-2.7-10.2-5.6-15.1-8.7c-8.8-5.7-19.7-7.8-29.7-4.6L69.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l30.9-28.1c7.7-7.1 11.4-17.5 10.9-27.9c-.1-2.9-.2-5.8-.2-8.8s.1-5.9 .2-8.8c.5-10.5-3.1-20.9-10.9-27.9L8.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l39.7 12.6c10 3.2 20.8 1.1 29.7-4.6c4.9-3.1 9.9-6.1 15.1-8.7c9.3-4.8 16.5-13.2 18.8-23.4l8.9-40.7c2-9.1 9-16.3 18.2-17.8C213.3 1.2 227.5 0 242 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l8.9 40.7c2.2 10.2 9.4 18.6 18.8 23.4c5.2 2.7 10.2 5.6 15.1 8.7c8.8 5.7 19.7 7.7 29.7 4.6l39.7-12.6c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM242 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z' />
    </svg>
  ),
  sparkle: (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='w-4 h-4'
      height='1em'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d='M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z' />
    </svg>
  ),
  sun: (
    <svg
      stroke='currentColor'
      fill='none'
      strokeWidth='2'
      viewBox='0 0 24 24'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='h-4 w-4'
      height='1em'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <circle cx='12' cy='12' r='5'></circle>
      <line x1='12' y1='1' x2='12' y2='3'></line>
      <line x1='12' y1='21' x2='12' y2='23'></line>
      <line x1='4.22' y1='4.22' x2='5.64' y2='5.64'></line>
      <line x1='18.36' y1='18.36' x2='19.78' y2='19.78'></line>
      <line x1='1' y1='12' x2='3' y2='12'></line>
      <line x1='21' y1='12' x2='23' y2='12'></line>
      <line x1='4.22' y1='19.78' x2='5.64' y2='18.36'></line>
      <line x1='18.36' y1='5.64' x2='19.78' y2='4.22'></line>
    </svg>
  ),
  tick: (
    <svg
      stroke='currentColor'
      fill='none'
      strokeWidth='2'
      viewBox='0 0 24 24'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='h-4 w-4'
      height='1em'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <polyline points='20 6 9 17 4 12'></polyline>
    </svg>
  ),
  close: (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.75'
      strokeLinecap='round'
      strokeLinejoin='round'
      xmlns='http://www.w3.org/2000/svg'
    >
      <line x1='18' y1='6' x2='6' y2='18' />
      <line x1='6' y1='6' x2='18' y2='18' />
    </svg>
  ),
  check: (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.75'
      strokeLinecap='round'
      strokeLinejoin='round'
      xmlns='http://www.w3.org/2000/svg'
    >
      <polyline points='20,6 9,17 4,12' />
    </svg>
  ),
  warning: (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.75'
      strokeLinecap='round'
      strokeLinejoin='round'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' />
      <line x1='12' y1='9' x2='12' y2='13' />
      <line x1='12' y1='17' x2='12.01' y2='17' />
    </svg>
  ),
  chevronDown: (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.75' strokeLinecap='round' strokeLinejoin='round' className='h-4 w-4' xmlns='http://www.w3.org/2000/svg'>
      <polyline points='6,9 12,15 18,9' />
    </svg>
  ),
  moreVertical: (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.75' strokeLinecap='round' strokeLinejoin='round' className='h-4 w-4' xmlns='http://www.w3.org/2000/svg'>
      <circle cx='12' cy='5' r='1' />
      <circle cx='12' cy='12' r='1' />
      <circle cx='12' cy='19' r='1' />
    </svg>
  ),
} satisfies Record<string, React.ReactElement>;

export type IconName = keyof typeof REGISTRY;

interface IconProps {
  name: IconName;
  /** Optional className override. If omitted, the icon's original baked className is used (identical to before). */
  className?: string;
}

const Icon = ({ name, className }: IconProps) => {
  const svg = REGISTRY[name];
  return className ? React.cloneElement(svg, { className }) : svg;
};

export default Icon;
