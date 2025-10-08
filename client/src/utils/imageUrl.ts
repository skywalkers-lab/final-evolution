/**
 * 이미지 URL을 직접 표시 가능한 형식으로 변환
 * Dropbox, Google Drive 등의 공유 링크를 직접 이미지 URL로 변환
 */
export function convertToDirectImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    
    // Dropbox 링크 변환
    if (urlObj.hostname.includes('dropbox.com')) {
      // dl=0을 dl=1로 변경 (직접 다운로드)
      urlObj.searchParams.set('dl', '1');
      // 또는 raw=1 추가 (원본 이미지)
      if (!urlObj.searchParams.has('raw')) {
        urlObj.searchParams.set('raw', '1');
      }
      return urlObj.toString();
    }
    
    // Google Drive 링크 변환
    if (urlObj.hostname.includes('drive.google.com')) {
      const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (fileIdMatch) {
        return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
      }
    }
    
    // 기타 URL은 그대로 반환
    return url;
  } catch (error) {
    console.error('Invalid URL:', url, error);
    return url;
  }
}

/**
 * 이미지 로드 실패 시 대체 이미지 표시 핸들러
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement>, fallbackElement?: HTMLElement | null) {
  const target = e.target as HTMLImageElement;
  target.style.display = 'none';
  
  if (fallbackElement) {
    fallbackElement.style.display = 'flex';
  } else {
    const nextElement = target.nextElementSibling as HTMLElement;
    if (nextElement) {
      nextElement.style.display = 'flex';
    }
  }
}
