const generateAvatar = (name: string) => {
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };

  const intToHex = (num: number) => {
    const hex = (num & 0x00ffffff).toString(16).toUpperCase();
    return '00000'.substring(0, 6 - hex.length) + hex;
  };

  const bgColor = intToHex(hashCode(name));
  const firstLetter = name?.charAt(0).toUpperCase() || 'U';

  return `https://placehold.co/200x200/${bgColor}/ffffff.png?text=${firstLetter}&font=Lato`;
};

export default generateAvatar;
