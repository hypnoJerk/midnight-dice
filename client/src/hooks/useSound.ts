import { useAudio } from '../context/AudioContext.js';

export function useSound() {
  const { playClick, playRoll, playSuccess, playDq } = useAudio();
  
  return {
    playClick,
    playRoll,
    playSuccess,
    playDq
  };
}
export default useSound;
