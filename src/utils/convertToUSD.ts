export const convertBdtToUsd = async (bdtAmount: string) => {
  try {
    const response = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=BDT');
    const data = await response.json();
    const usdToBdtRate = data.rates.BDT;

    // Convert BDT to USD
    const usdAmount = (parseFloat(bdtAmount) / usdToBdtRate).toFixed(2);
    return usdAmount;
  } catch (error) {
    console.error('Conversion failed:', error);
    return null;
  }
};
