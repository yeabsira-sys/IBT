# Addis Eats Component Boundary

| Component                            | Side          | Justification                                                       |
| ------------------------------------ | ------------- | ------------------------------------------------------------------- |
| `app/layout.js`                      | Server        | Provides the root document structure without browser interactivity. |
| `app/page.js`                        | Server        | Contains static page content and navigation.                        |
| `app/providers.js`                   | Client        | Creates the client boundary for application providers.              |
| `context/CartProvider.js`            | Client        | Uses React context and state to manage the cart.                    |
| `app/menu/page.js`                   | Server        | Fetches menu data asynchronously on the server.                     |
| `app/menu/[id]/page.js`              | Server        | Fetches the requested dish asynchronously on the server.            |
| `app/menu/components/DishList.js`    | Server        | Only renders server-provided dish data.                             |
| `app/menu/components/CategoryBar.js` | Server/Client | Interactive only if category selection requires client state.       |
| `app/menu/loading.js`                | Server        | Only renders loading markup.                                        |
| `app/menu/error.js`                  | Client        | Uses the interactive `reset()` callback.                            |
| `app/menu/not-found.js`              | Server        | Only renders the not-found UI.                                      |
