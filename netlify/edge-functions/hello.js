export default () => {
  const message = "Hello world";
  console.log(message);
  return new Response(message);
};
