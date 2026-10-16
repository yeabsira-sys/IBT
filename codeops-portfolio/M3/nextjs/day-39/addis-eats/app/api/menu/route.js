export const GET = async (request) => {
  console.log(request);
  return new Response(JSON.stringify({ message: request }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
