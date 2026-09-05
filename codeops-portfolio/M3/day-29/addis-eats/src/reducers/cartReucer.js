const cartReducer = (state, action) => {
  switch (action.type) {
    case "ADD_ITEM": {
      const existingItem = state.find((item) => item.id === action.payload.id);

      if (existingItem) {
        return state.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...state, { ...action.payload, quantity: 1 }];
    }

    case "REMOVE_ITEM":
      return state.filter((item) => item.id !== action.payload);

    case "INCREASE":
      return state.map((item) =>
        item.id === action.payload
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );

    case "DECREASE":
      return state
        .map((item) =>
          item.id === action.payload
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        )
        .filter((item) => item.quantity > 0);

    case "CLEAR_CART":
      return [];

    default:
      return state;
  }
};

export default cartReducer;
