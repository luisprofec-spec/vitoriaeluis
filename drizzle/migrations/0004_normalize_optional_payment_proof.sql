CREATE OR REPLACE FUNCTION public.register_paid_gift(_id uuid,_guest text,_contact text,_items jsonb,_method text,_text text,_card_style text,_proof text,_transaction_id text,_paid boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _item jsonb; _gift public.gifts; _total numeric := 0; _titles text[] := '{}'; _actual jsonb := '[]'::jsonb;
BEGIN
 _proof := nullif(trim(_proof),'');
 IF _paid IS DISTINCT FROM true THEN RAISE EXCEPTION 'payment confirmation required'; END IF;
 IF _id IS NULL OR length(trim(_guest)) NOT BETWEEN 1 AND 120 OR length(coalesce(_contact,'')) > 160 OR length(coalesce(_text,'')) > 1000 OR length(coalesce(_transaction_id,'')) > 200 OR _method NOT IN ('Pix','Cartão','Boleto') OR _card_style NOT IN ('floral','honeymoon','minimal','party') THEN RAISE EXCEPTION 'invalid submission'; END IF;
 IF jsonb_typeof(_items) IS DISTINCT FROM 'array' OR jsonb_array_length(_items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid cart'; END IF;
 IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(_items)) <> jsonb_array_length(_items) THEN RAISE EXCEPTION 'duplicate gift'; END IF;
 IF _proof IS NOT NULL AND (_proof NOT LIKE _id::text || '/%' OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'payment-proofs' AND name = _proof)) THEN RAISE EXCEPTION 'invalid proof'; END IF;
 PERFORM id FROM public.gifts WHERE id IN (SELECT (value->>'id')::uuid FROM jsonb_array_elements(_items)) ORDER BY id FOR UPDATE;
 FOR _item IN SELECT value FROM jsonb_array_elements(_items) LOOP
  SELECT * INTO _gift FROM public.gifts WHERE id = (_item->>'id')::uuid;
  IF NOT FOUND OR _gift.id IN (SELECT public.unavailable_gift_ids()) THEN RAISE EXCEPTION 'gift unavailable'; END IF;
  IF (_item->>'price')::numeric IS DISTINCT FROM _gift.price THEN RAISE EXCEPTION 'gift price changed'; END IF;
  _total := _total + _gift.price; _titles := array_append(_titles,_gift.title);
  _actual := _actual || jsonb_build_array(jsonb_build_object('id',_gift.id,'title',_gift.title,'price',_gift.price));
 END LOOP;
 INSERT INTO public.contributions(id,guest,contact,items,total,method,status,proof,transaction_id) VALUES (_id,trim(_guest),trim(coalesce(_contact,'')),_actual,_total,_method,'pending_confirmation',_proof,nullif(trim(_transaction_id),''));
 IF length(trim(coalesce(_text,''))) > 0 THEN INSERT INTO public.messages(guest,text,card_style,gifts) VALUES (trim(_guest),trim(_text),_card_style,array_to_string(_titles,', ')); END IF;
 RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.register_paid_gift(uuid,text,text,jsonb,text,text,text,text,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_paid_gift(uuid,text,text,jsonb,text,text,text,text,text,boolean) TO anon,authenticated;
