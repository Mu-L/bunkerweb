export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  let data;
  try {
    data = await $fetch(`/instances`, {
      baseURL: config.apiCore,
      method: "POST",
    });
  } catch (err) {
    data = Promise.reject(new Error("fail getting data"));
  }
  return data;
});
